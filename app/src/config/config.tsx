
//initData
export function getInitData(): any{
  //symentic encryption key
  const DECRYPTKEY = '';
  const MOVIE_ENDPOINT = '<path of the api json file(https://domain_name)>/servers.json';
  return {
    decrypt_key: DECRYPTKEY,
    movie_endpoint: MOVIE_ENDPOINT
  }
}