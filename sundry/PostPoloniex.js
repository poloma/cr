var request = require('request');

var parameters = {};
parameters.command = 'returnBalances';
parameters.nonce = 0;


var options = {
  method: 'POST',
  url: 'https://poloniex.com/tradingApi',
  form: parameters,
  headers: {
    'Key': '1Q0BJ6CX-QESJ00ND-3NOAYKKE-GLX6B8J3',
    'Sign': '9915a3cbcf751e3bb619c98cee19b3c448cfe76adae58248f849c1c78bc7f28d61852ba1d2cfba5734214eb5b12952606f56efe35fc2546dfd937a2027f62470'
  }
};

request.post(options,function(err,res,body){
//  console.log(err);
  console.log(res);
});

