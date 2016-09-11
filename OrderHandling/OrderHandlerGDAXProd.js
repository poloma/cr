var PropertiesReader = require('properties-reader');
var properties = PropertiesReader('/home/jeff/api/apiSettings.ini');
var key = properties.get('data.keyGDAX');
var secret = properties.get('data.secretGDAX');
var pass = properties.get('data.passPhraseGDAX');
var GDAX = require('gdax');
var gdax = new GDAX.AuthenticatedClient(key,secret,pass);
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var uuid = require('uuid');

function OrderHandlerGDAXProd(){
  EventEmitter.call(this);
}
inherits(OrderHandlerGDAXProd,EventEmitter);

OrderHandlerGDAXProd.prototype.newOrder = function newOrder(msg){
  var self = this;
  var action = msg.side;
  var currencyPair = msg.currencyPair;

  switch(action){
    case "buy":
      var buyParams = {
        'price': msg.rate,
        'size': msg.amount,
        'product_id': currencyPair,
        'client_oid': msg.oid
      }
      gdax.buy(buyParams,function(err,res,data){
        self.emit('new_ack',data);
      });
      break;
    case "sell":
      var sellParams = {
        'price': msg.rate,
        'size': msg.amount,
        'product_id': currencyPair,
        'client_oid': msg.oid
      }
      gdax.sell(sellParams,function(err,res,data){
        self.emit('new_ack',data);
      });
      break;
  }
} 
OrderHandlerGDAXProd.prototype.cancelOrder = function cancelOrder(msg){
  var self = this;
      gdax.cancelOrder(msg.orderNumber,function(err,res,data){
        self.emit('cancel_ack',data);
      });
}
OrderHandlerGDAXProd.prototype.modifyOrder = function modifyOrder(msg){
  this.cancelOrder(msg);
}

OrderHandlerGDAXProd.prototype.query = function query(msg){
  var self = this;
  var action = msg.side;
  var currencyPair = msg.currencyPair;

  switch(action){
    case "fills":
      gdax.getFills(function(err,res,data){
        self.emit('fill_ack',data);
      });
      break;
    case "openOrders":
      gdax.getOrders(function(err,res,data){
        self.emit('ack',data);
      });
      break;
    case "getOrder":
      gdax.getOrder(msg.orderNumber,function(err,res,data){
        self.emit('ack',data);
      });
      break;
    case "cancelAll":
      gdax.cancelAllOrders(function(err,res,data){
        self.emit('ack',data);
      });
      break;
    default:
      console.log('command not recognized');  
}


module.exports = OrderHandlerGDAXProd;