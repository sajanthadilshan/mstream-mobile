const fs = require('fs').promises;

//symentic encryption key (same key used in app for decryption)
const ENCTKEY = "";

//tmdb key
const tmdbkey = "";

//list of movie streaming servers
const movieServers = [
  `https://example.com/movie`,
];

//list of tv series streaming
const tvServers = [
  `https://example.com/tv`,
];


//notifications
const messages = [
    {
        id: "1",
        title: "Attention:",
        date: "Nov 1 2026",
        message: "helllo..."
    },{
        id: "2",
        title: "Attention:",
        date: "Nov 1 2026",
        message: "helllo..."
    }
]


//encode text enc key
async function getKey(password) {
  const enc = new TextEncoder();
  const rawKey = enc.encode(password);
  
  // Hash the password so it's always exactly 256 bits (32 bytes)
  const hash = await crypto.subtle.digest("SHA-256", rawKey);
  
  return await crypto.subtle.importKey(
    "raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
  );
}

// 1. ENCRYPT Function
async function encrypt(plainText, password) {
  const key = await getKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // Secure random IV
  const encodedText = new TextEncoder().encode(plainText);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv }, key, encodedText
  );
  // Combine IV and Encrypted Data so we only have one string to manage
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);
  // Convert binary to readable Hex string
  return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Process a list of usernames.
 * @param {string[]} arr - An array of string values
 */
async function encryptArr(arr, key){
    let out = [];
    for(let i = 0; i<arr.length; i++){
        if(typeof arr[i] === 'object' && arr[i] !== null && !Array.isArray(arr[i])){
            let item = arr[i];
            let temp = {}
            for (const [key, value] of Object.entries(item)) {
                temp[key] = await encrypt(value, key)
            }
            out.push(temp)
        }else{
            out.push(await encrypt(arr[i], key))
        }
    }
    return out;
}





(async()=>{
    let m = await encryptArr(movieServers, ENCTKEY);
    let t = await encryptArr(tvServers, ENCTKEY);
    let k = await encrypt( tmdbkey, ENCTKEY);

    const out = JSON.stringify(
      {
        movie_servers: {
          movie: m,
          tv: t
        },
        apikey: k,
        notifications: await encryptArr(messages, ENCTKEY)
      }
    )

    fs.writeFile("./servers.json", out, "utf8")

})()