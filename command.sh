# test
npm start create-account

npm start deploy ./contract/user.lua
npm start call ./contract/user.abi.json add nathan dfafdasfdasfa
npm start query ./contract/user.abi.json get nathan

npm start deploy ./contract/hello.lua
npm start call ./contract/hello.abi.json set_name nathan
npm start query ./contract/hello.abi.json hello

# production
npm run start:production create-account

npm run start:production deploy ./contract/user.lua
npm run start:production call ./contract/user.abi.json add nathan dfafdasfdasfa
npm run start:production query ./contract/user.abi.json get nathan

npm run start:production deploy ./contract/hello.lua
npm run start:production call ./contract/hello.abi.json set_name nathan
npm run start:production query ./contract/hello.abi.json hello