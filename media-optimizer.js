/**
 * Otimizador de mídia — painel admin
 * - Fotos: WebP (ou JPEG) redimensionado, max 1920px, uma vez por arquivo (hash SHA-256 do original)
 * - Vídeos: upload único ao Storage pelo hash (sem recompressão no navegador — evita travar)
 *
 * Requer: firebase-storage-compat, usuário autenticado, regras do Storage permitirem escrita em optimized_*
 */
(function (global) {
    'use strict';

    var MAX_IMG_DIM = 1920;
    /** JPEG fixo: mesmo arquivo original = sempre o mesmo path (hash + .jpg) */
    var IMG_QUALITY_JPEG = 0.82;
    var MAX_VIDEO_BYTES = 450 * 1024 * 1024;

    function getStorage() {
        if (typeof firebase === 'undefined' || !firebase.storage) return null;
        return firebase.storage();
    }

    async function sha256Hex(buffer) {
        var h = await crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(h))
            .map(function (b) { return b.toString(16).padStart(2, '0'); })
            .join('');
    }

    /** Hash leve para vídeo grande (evita ler arquivo inteiro na memória) */
    async function fingerprintVideoFile(file) {
        var head = await file.slice(0, Math.min(1024 * 1024, file.size)).arrayBuffer();
        var tailSlice = file.size > 1024 * 1024
            ? file.slice(Math.max(0, file.size - 1024 * 1024))
            : null;
        var tail = tailSlice ? await tailSlice.arrayBuffer() : new ArrayBuffer(0);
        var meta = new TextEncoder().encode(
            file.name + '|' + file.size + '|' + file.lastModified + '|' + file.type
        );
        var u8 = new Uint8Array(head.byteLength + tail.byteLength + meta.length);
        u8.set(new Uint8Array(head), 0);
        u8.set(new Uint8Array(tail), head.byteLength);
        u8.set(meta, head.byteLength + tail.byteLength);
        return sha256Hex(u8.buffer);
    }

    /**
     * @param {Blob} blob
     * @returns {Promise<Blob>} sempre image/jpeg para path único no Storage
     */
    function compressImageBlob(blob) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(blob);
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                URL.revokeObjectURL(url);
                try {
                    var w = img.naturalWidth || img.width;
                    var h = img.naturalHeight || img.height;
                    var scale = Math.min(1, MAX_IMG_DIM / w, MAX_IMG_DIM / h);
                    var tw = Math.max(1, Math.round(w * scale));
                    var th = Math.max(1, Math.round(h * scale));
                    var canvas = document.createElement('canvas');
                    canvas.width = tw;
                    canvas.height = th;
                    var ctx = canvas.getContext('2d');
                    if (blob.type === 'image/jpeg' || blob.type === 'image/webp' || blob.type === 'image/png') {
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(0, 0, tw, th);
                    }
                    ctx.drawImage(img, 0, 0, tw, th);
                    canvas.toBlob(
                        function (out) {
                            if (!out) {
                                reject(new Error('Falha ao gerar imagem'));
                                return;
                            }
                            resolve(out);
                        },
                        'image/jpeg',
                        IMG_QUALITY_JPEG
                    );
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error('Imagem inválida ou corrompida'));
            };
            img.src = url;
        });
    }

    /**
     * Se o objeto já existe no Storage, devolve a URL sem reenviar.
     * Trata erros de permissão no getMetadata como "arquivo não existe" e
     * prossegue para o upload — evita ficar travado em "verificando…".
     */
    function getExistingUrlOrUpload(ref, blob, contentType, onProgress) {
        return ref
            .getMetadata()
            .then(function () {
                // Arquivo já existe — retorna URL direto
                return ref.getDownloadURL();
            })
            .catch(function (e) {
                // Se o arquivo não existe OU se não temos permissão de leitura de metadata
                // (o Storage só permite leitura pública de download, não de metadata em alguns projetos),
                // prosseguimos para o upload. Só relançamos erros que não sejam de ausência/permissão.
                var ignoreCodes = [
                    'storage/object-not-found',
                    'storage/unauthorized',
                    'storage/unauthenticated',
                ];
                if (ignoreCodes.indexOf(e.code) === -1) throw e;

                var task = ref.put(blob, { contentType: contentType });
                if (onProgress && task.on) {
                    task.on('state_changed', function (snap) {
                        if (snap.totalBytes) {
                            onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
                        }
                    });
                }
                return task.then(function () {
                    return ref.getDownloadURL();
                });
            });
    }

    /**
     * @param {File} file
     * @param {function(number)|undefined} onProgress 0-100
     * @returns {Promise<string>} download URL
     */
    function uploadOptimizedImage(file, onProgress) {
        var st = getStorage();
        if (!st) return Promise.reject(new Error('Storage não disponível'));
        if (!file.type || file.type.indexOf('image/') !== 0) {
            return Promise.reject(new Error('Selecione um arquivo de imagem'));
        }
        return file.arrayBuffer().then(function (buf) {
            return sha256Hex(buf).then(function (hash) {
                var path = 'optimized_images/' + hash + '.jpg';
                var ref = st.ref(path);
                var ignoreCodes = [
                    'storage/object-not-found',
                    'storage/unauthorized',
                    'storage/unauthenticated',
                ];
                return ref
                    .getMetadata()
                    .then(function () {
                        return ref.getDownloadURL();
                    })
                    .catch(function (e) {
                        if (ignoreCodes.indexOf(e.code) === -1) throw e;
                        return compressImageBlob(new Blob([buf], { type: file.type })).then(function (blob) {
                            var task = ref.put(blob, { contentType: 'image/jpeg' });
                            if (onProgress && task.on) {
                                task.on('state_changed', function (snap) {
                                    if (snap.totalBytes) {
                                        onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
                                    }
                                });
                            }
                            return task.then(function () {
                                return ref.getDownloadURL();
                            });
                        });
                    });
            });
        });
    }

    /**
     * Vídeo: sem re-encoding (evita travar). Mesmo arquivo = mesmo hash = um único upload.
     */
    function uploadOptimizedVideo(file, onProgress) {
        var st = getStorage();
        if (!st) return Promise.reject(new Error('Storage não disponível'));
        if (!file.type || file.type.indexOf('video/') !== 0) {
            return Promise.reject(new Error('Selecione um arquivo de vídeo'));
        }
        if (file.size > MAX_VIDEO_BYTES) {
            return Promise.reject(new Error('Vídeo muito grande (máx. ~450 MB). Comprima com outro app ou use YouTube/Vimeo.'));
        }
        return fingerprintVideoFile(file).then(function (hash) {
            var ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
            var path = 'optimized_videos/' + hash + '.' + ext;
            var ref = st.ref(path);
            return getExistingUrlOrUpload(ref, file, file.type || 'video/mp4', onProgress);
        });
    }

    global.LBMediaOptimizer = {
        uploadOptimizedImage: uploadOptimizedImage,
        uploadOptimizedVideo: uploadOptimizedVideo,
        MAX_VIDEO_BYTES: MAX_VIDEO_BYTES,
    };
})(typeof window !== 'undefined' ? window : this);
