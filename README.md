# pokego-account-creator
Creates PTC accounts.
- Two parts: Signup & Email Polling for verification
- Scrapes proxies and checks them prior to use (currently disabled, need a better source for a larger volume of stable proxies)
- Uses NightmareJS



## Setup
- Rename `config.json.example` to `config.json`
- Purchase a domain or use Afraid DNS etc.
- Configure DNS on domain as a catchall redirect to gmail address
- Add domain and all other required config info to `config.json`
- `npm i` to install
- `node server.js` to run
