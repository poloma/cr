
function MktMakeAlgo(properties,orderBookMgr,orderHandler,dataHandler,product,server,profitMgr){

  this.distance = properties.get('distance').split(",");
  this.amount = properties.get('amount').split(",");
  this.takeProfit = properties.get('takeProfit').split(",");
  this.stopOut = properties.get('stopOut').split(",");
  this.stopOutTime = properties.get('stopOutTime').split(",");
  this.state = properties.get('state');
  this.sens = properties.get('sens').split(",");
  this.minIncrement = properties.get('minIncrement');
  this.orderBookMgr = orderBookMgr;
  this.orderHandler = orderHandler;
  this.dataHandler = dataHandler;
  this.product = product;
  this.server = server;
  this.profitMgr = profitMgr;
  this.bids= [];
  this.asks= [];
  this.pos = 0;
  this.msg = 0;
  
}

MktMakeAlgo.prototype.greaterThan = function(a,b){
  if(a>b){
    return true;
  }
  return false;
}

MktMakeAlgo.prototype.lessThan = function(a,b){
  if(a<b){
    return true;
  }
  return false;
}

MktMakeAlgo.prototype.generateLevels = function(){
  var Level = require('../Trading/Level');

  for(var i = 0;i<this.distance.length;i++){
    this.bids.push(new Level(i,this.product,"buy",-this.distance[i],Number(this.amount[i]),Number(this.takeProfit[i]),Number(this.stopOut[i]),this.orderHandler,this.state,Number(this.sens[i]),Number(this.stopOutTime[i]),this.dataHandler,this.lessThan,this.minIncrement));
  }
  for(var i = 0;i<this.distance.length;i++){
    this.asks.push(new Level(i,this.product,"sell",Number(this.distance[i]),Number(this.amount[i]),Number(this.takeProfit[i]),Number(this.stopOut[i]),this.orderHandler,this.state,Number(this.sens[i]),Number(this.stopOutTime[i]),this.dataHandler,this.greaterThan,this.minIncrement));
  }


  this.server.register(this.bids,this.asks);
}

MktMakeAlgo.prototype.registerListeners = function(){
  var self = this;
  this.orderBookMgr.on('bidUpdate',function(data){
    for(var i = 0;i<self.bids.length;i++){
      self.bids[i].updateTOB(data);
    }
  });

  this.orderBookMgr.on('askUpdate',function(data){
    for(var i = 0;i<self.asks.length;i++){
      self.asks[i].updateTOB(data);
    }
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
      self.pos = self.pos + fill.size;
      self.profitMgr.updateLong(fill);
      self.server.updatePos(self.pos);
      self.server.updateRealized(self.profitMgr.getRealized());
    });
    this.bids[i].on('exitFill',function(fill){
      self.pos = self.pos - fill.size;
      self.profitMgr.updateShort(fill);
      self.server.updatePos(self.pos);
      self.server.updateRealized(self.profitMgr.getRealized());
    });
  } 

  for(var i = 0;i<this.asks.length;i++){
    this.asks[i].on('entryFill',function(fill){
      self.pos = self.pos - fill.size;
      self.profitMgr.updateShort(fill);
      self.server.updatePos(self.pos);
      self.server.updateRealized(self.profitMgr.getRealized());
    });
    this.asks[i].on('exitFill',function(fill){
      self.pos = self.pos + fill.size;
      self.profitMgr.updateLong(fill);
      self.server.updatePos(self.pos);
      self.server.updateRealized(self.profitMgr.getRealized());
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

module.exports = MktMakeAlgo;
