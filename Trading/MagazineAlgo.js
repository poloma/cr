var SweepAlgo = require('../Trading/SweepAlgo');
var inherits = require('util').inherits;
var bidTOB;
var askTOB;

var MagazineAlgo = function(properties,orderBookMgr,orderHandler,dataHandler,product,server,profitMgr){

  SweepAlgo.call(this,properties,orderBookMgr,orderHandler,dataHandler,product,server,profitMgr);
  this.sizeLevels = properties.get('sizeLevels');
  this.sizeDiff = properties.get('sizeDiff');
  this.clipSize = properties.get('clipSize');
  this.minSpread = properties.get('minSpread');
}

inherits(MagazineAlgo,SweepAlgo);

MagazineAlgo.prototype.generateLevels = function(){
  var Magazine = require('../Trading/Magazine');

  for(var i = 0;i<this.distance.length;i++){
    this.bids.push(new Magazine(i,this.product,"buy",Number(this.distance[i]),Number(this.amount[i]),Number(this.takeProfit[i]),Number(this.stopOut[i]),this.orderHandler,this.state,Number(this.sens[i]),Number(this.stopOutTime[i]),this.dataHandler,this.lessThan,this.minIncrement,this.clipSize,this.minSpread));
  }
  for(var i = 0;i<this.distance.length;i++){
    this.asks.push(new Magazine(i,this.product,"sell",-Number(this.distance[i]),Number(this.amount[i]),Number(this.takeProfit[i]),Number(this.stopOut[i]),this.orderHandler,this.state,Number(this.sens[i]),Number(this.stopOutTime[i]),this.dataHandler,this.greaterThan,this.minIncrement,this.clipSize,this.minSpread));
  }

  this.server.register(this.bids,this.asks);

}

MagazineAlgo.prototype.registerListeners = function(){
  var self = this;
  var bidSize =0;
  var askSize =0;

  var updateState = function(book,state){
    for(var i = 0;i<book.length;i++){
      book[i].changeState(state);
    }
  }

  var checkSize = function(){
    var imbalance = self.bidSize - self.askSize;
    self.server.updateIndicator(imbalance);
    //long imbalance
    if(imbalance > self.sizeDiff){
//      console.log('buy',self.bidSize - self.askSize)
      if(self.pos >=0){
        if(self.bids[0].levelState == "closing" || self.bids[0].levelState == "neutral"){
          updateState(self.bids,"on"); 
        }
      }
      if(self.asks[0].levelState == "on" || self.asks[0].levelState == "neutral"){
        updateState(self.asks,"closing");
      }
    }else if(imbalance < -self.sizeDiff){
    //short imbalance
//      console.log('sell',self.askSize - self.bidSize)
      if(self.pos <=0){
        if(self.asks[0].levelState == "closing" || self.asks[0].levelState == "neutral"){
          updateState(self.asks,"on");
        }
      }
      if(self.bids[0].levelState == "on" || self.bids[0].levelState == "neutral"){
        updateState(self.bids,"closing");
      }
    }else{
      //should TP enter on neutral or wait for flip?
      //neutral persists due to sizeDiff param
//      console.log("neutral",self.bidSize - self.askSize)
      if(self.bids[0].levelState == "on" || self.bids[0].levelState == "closing"){
        updateState(self.bids,"neutral");
      }
      if(self.asks[0].levelState == "on" || self.asks[0].levelState == "closing"){
        updateState(self.asks,"neutral");
      }
    }
  }

  this.orderBookMgr.on('bidUpdate',function(data){
    self.bidTOB = data;
    for(var i = 0;i<self.bids.length;i++){
      self.bids[i].updateTOB(self.bidTOB,self.askTOB);
    }
    self.bidSize = Number(self.orderBookMgr.getSize("bid",self.sizeLevels)).toFixed(4);
    checkSize();
  });

  this.orderBookMgr.on('askUpdate',function(data){
    self.askTOB = data;
    for(var i = 0;i<self.asks.length;i++){
      self.asks[i].updateTOB(self.askTOB,self.bidTOB);
    }
    self.askSize = Number(self.orderBookMgr.getSize("ask",self.sizeLevels)).toFixed(4);
    checkSize();
  });

  this.orderBookMgr.on('lastUpdate',function(data){
    for(var i = 0;i<self.asks.length;i++){
      self.asks[i].updateLastTrade(data);
    }
    for(var i = 0;i<self.bids.length;i++){
      self.bids[i].updateLastTrade(data);
    }
  });

  this.orderBookMgr.on('seq gap',function(){
    for(var i = 0;i<self.bids.length;i++){
      self.bids[i].cancelAll();
    }
    for(var i = 0;i<self.asks.length;i++){
      self.asks[i].cancelAll();
    }
  });

  this.orderBookMgr.on('disconnect',function(){
    for(var i = 0;i<self.bids.length;i++){
      self.bids[i].cancelAll();
    }
    for(var i = 0;i<self.asks.length;i++){
      self.asks[i].cancelAll();
    }
  });
  

  for(var i = 0;i<this.bids.length;i++){
    this.bids[i].on('entryFill',function(fill){
      self.pos = Number(self.pos) + Number(fill.size);
      self.profitMgr.updateLong(fill);
      self.server.updatePos(self.pos);
      self.server.updateRealized(self.profitMgr.getRealized());
      updateState(self.asks,'closing');
    });
    this.bids[i].on('exitFill',function(fill){
      self.pos = Number(self.pos) - Number(fill.size);
      self.profitMgr.updateShort(fill);
      self.server.updatePos(self.pos);
      self.server.updateRealized(self.profitMgr.getRealized());
      updateState(self.asks,'on');
    });
  } 

  for(var i = 0;i<this.asks.length;i++){
    this.asks[i].on('entryFill',function(fill){
      self.pos = Number(self.pos) - Number(fill.size);
      self.profitMgr.updateShort(fill);
      self.server.updatePos(self.pos);
      self.server.updateRealized(self.profitMgr.getRealized());
      updateState(self.bids,'closing');
    });
    this.asks[i].on('exitFill',function(fill){
      self.pos = Number(self.pos) + Number(fill.size);
      self.profitMgr.updateLong(fill);
      self.server.updatePos(self.pos);
      self.server.updateRealized(self.profitMgr.getRealized());
      updateState(self.bids,'on');
    });
  } 
  this.orderHandler.on('new_ack',function(data){
    self.msg++;
    self.server.updateMsgCount(self.msg);
  });

  this.orderHandler.on('cancel_ack',function(data){
    self.msg++;
    self.server.updateMsgCount(self.msg);
  });
}

module.exports = MagazineAlgo;
