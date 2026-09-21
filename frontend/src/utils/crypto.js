/**
 * Computes the SHA-256 hash of a File object using the Web Crypto API.
 * @param {File} file - The file to hash
 * @returns {Promise<string>} The 64-character lowercase hex string of the hash
 */
export async function calculateFileHash(file) {
  if (!file) {
    throw new Error("No file provided");
  }

  // Read the file as an ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  if (arrayBuffer.byteLength === 0) {
    throw new Error("File is empty");
  }

  // Hash the buffer using SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  
  // Convert the buffer to a hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
    
  return hashHex.toLowerCase();
}
