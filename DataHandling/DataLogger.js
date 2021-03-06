
function DataLogger(){
}

DataLogger.prototype.run = function run(){
  this.handler.run();
  var self = this;
  this.handler.on('disconnect',function(){
    setTimeout(function(){
      self.handler = new self.Handler(self.product);
      self.printer = new self.Printer(self.handler,self.outputDir);
      self.handler.run();
    }, 30000);
  });
};
module.exports = DataLogger;
