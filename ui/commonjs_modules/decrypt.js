// decrypt.js
async function getKey(password) {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(password));
    return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['decrypt']);
}

export async function decrypt(hexString, password) {
    const key = await getKey(password);
    const combined = new Uint8Array(hexString.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(buf);
}

export async function decryptTvSeriesSvrs(arr, key, seriesId, seasonId, episode) {
    return Promise.all(
        arr.map(async (s) => `${await decrypt(s, key)}/${seriesId}/${seasonId}/${episode}`)
    );
}

export async function decryptMovieSvrs(arr, key, movieId) {
    return Promise.all(arr.map(async (s) => `${await decrypt(s, key)}/${movieId}`));
}

export async function decryptNotifications(arr, password) {
    try {
        return await Promise.all(
            arr.map(async (notification) => ({
                id: await decrypt(notification.id, password),
                title: await decrypt(notification.title, password),
                date: await decrypt(notification.date, password),
                message: await decrypt(notification.message, password)
            }))
        );
    } catch (error) {
        console.error("Notification decryption error:", error);
        throw error;
    }
}