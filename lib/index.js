var ElasticQueue, Hoek, async, baseConfig, elasticsearch, events, exports,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

elasticsearch = require('elasticsearch');

Hoek = require('hoek');

async = require('async');

events = require('events');

baseConfig = {
  elasticsearch: {
    client: {
      host: "localhost:9200",
      log: "info",
      minSockets: 1,
      sniffInterval: 60000,
      sniffOnStart: true,
      suggestCompression: true
    }
  },
  concurency: 1,
  batchSize: 500,
  commitTimeout: 1000,
  rateLimit: 2000,
  batchHandler: null
};

ElasticQueue = (function(superClass) {
  extend(ElasticQueue, superClass);

  function ElasticQueue(config, esClient) {
    var ref;
    if (config == null) {
      config = {};
    }
    this.elasticSearchBatchHandler = bind(this.elasticSearchBatchHandler, this);
    this.task = bind(this.task, this);
    this.batchComplete = bind(this.batchComplete, this);
    this.batch = bind(this.batch, this);
    this.check = bind(this.check, this);
    this.drain = bind(this.drain, this);
    this.config = Hoek.applyToDefaults(baseConfig, config);
    this.queue = [];
    this.checkTimer = setInterval(this.check, this.config.rateLimit);
    this.async = async.queue(this.task, this.config.concurency);
    this.async.drain = this.drain;
    this.count = 1;
    if (((ref = this.config) != null ? ref.batchHandler : void 0) == null) {
      if (esClient != null) {
        this.esClient = esClient;
      } else {
        this.setup_elastic();
      }
    }
  }

  ElasticQueue.prototype.drain = function() {
    if (this.queue.length === 0) {
      return this.emit('drain');
    }
  };

  ElasticQueue.prototype.setup_elastic = function() {
    return this.esClient = new elasticsearch.Client(this.config.elasticsearch.client);
  };

  ElasticQueue.prototype.push = function(task, callback) {
    if (callback == null) {
      callback = null;
    }
    return this.queue.push({
      task: task,
      callback: callback
    });
  };

  ElasticQueue.prototype.check = function() {
    if (this.queue.length > 0) {
      return this.batch();
    }
  };

  ElasticQueue.prototype.batch = function() {
    var size;
    size = this.queue.length;
    if (size >= this.config.batchSize) {
      size = this.config.batchSize;
    }
    if (size > 0) {
      this.async.push({
        batch: this.queue.splice(0, size),
        count: this.count++
      }, this.batchComplete);
    }
    if (this.queue.length > 0) {
      clearTimeout(this.batchTimeout);
      return this.batchTimeout = setTimeout(this.batch, this.config.rateLimit + this.config.commitTimeout);
    }
  };

  ElasticQueue.prototype.batchComplete = function(err, resp, task) {
    var messages;
    messages = [];
    if ((resp != null ? resp.items : void 0) != null) {
      resp.items.forEach(function(item) {
        var ref;
        return messages[item != null ? (ref = item.index) != null ? ref._id : void 0 : void 0] = item;
      });
    }
    if ((task != null ? task.batch : void 0) != null) {
      task.batch.forEach(function(item) {
        var message, ref, ref1, ref2, ref3;
        if ((item != null ? item.callback : void 0) != null) {
          if (((item != null ? (ref = item.task) != null ? ref.id : void 0 : void 0) != null) && (messages[item != null ? (ref1 = item.task) != null ? ref1.id : void 0 : void 0] != null)) {
            message = messages[item != null ? (ref2 = item.task) != null ? ref2.id : void 0 : void 0];
            if ([200, 201].indexOf(message != null ? (ref3 = message.index) != null ? ref3.status : void 0 : void 0) > -1) {
              return item.callback(null, message);
            } else {
              return item.callback(new Error(message.index.error), message);
            }
          } else {
            return item.callback(err, resp);
          }
        }
      });
    }
    if (err) {
      return this.emit('error', err);
    }
    return this.emit('batchComplete', resp);
  };

  ElasticQueue.prototype.task = function(task, callback) {
    var ref;
    this.emit('task', task);
    if (((ref = this.config) != null ? ref.batchHandler : void 0) != null) {
      return this.config.batchHandler(task, callback);
    } else {
      return this.elasticSearchBatchHandler(task, callback);
    }
  };

  ElasticQueue.prototype.elasticSearchBatchHandler = function(task, done) {
    var index, key, ref, value;
    index = [];
    ref = task.batch;
    for (key in ref) {
      value = ref[key];
      index.push({
        index: {
          _index: value.task.index,
          _type: value.task.type,
          _id: value.task.id
        }
      });
      if (value.task.body != null) {
        index.push(value.task.body);
      }
    }
    return this.esClient.bulk({
      body: index
    }, function(err, res) {
      if (err) {
        return done(err, null, task);
      }
      return done(null, res, task);
    });
  };

  ElasticQueue.prototype.close = function() {
    if (this.esClient != null) {
      return this.esClient.close();
    }
  };

  return ElasticQueue;

})(events.EventEmitter);

module.exports = exports = ElasticQueue;

//# sourceMappingURL=data:application/json;base64,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QUFMLEVBQVcsR0FBWCxFQUFnQixJQUFoQixFQUYwQjtJQUFBLENBQTVCLEVBVnlCO0VBQUEsQ0F4RTNCLENBQUE7O0FBQUEseUJBc0ZBLEtBQUEsR0FBTyxTQUFBLEdBQUE7QUFDTCxJQUFBLElBQUcscUJBQUg7YUFDRSxJQUFDLENBQUEsUUFBUSxDQUFDLEtBQVYsQ0FBQSxFQURGO0tBREs7RUFBQSxDQXRGUCxDQUFBOztzQkFBQTs7R0FGeUIsTUFBTSxDQUFDLGFBcEJsQyxDQUFBOztBQUFBLE1BZ0hNLENBQUMsT0FBUCxHQUFpQixPQUFBLEdBQVUsWUFoSDNCLENBQUEiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyJlbGFzdGljc2VhcmNoID0gcmVxdWlyZSAnZWxhc3RpY3NlYXJjaCdcbkhvZWsgPSByZXF1aXJlICdob2VrJ1xuYXN5bmMgPSByZXF1aXJlICdhc3luYydcbmV2ZW50cyA9IHJlcXVpcmUgJ2V2ZW50cydcblxuYmFzZUNvbmZpZyA9XG4gIGVsYXN0aWNzZWFyY2g6XG4gICAgY2xpZW50OlxuICAgICAgaG9zdDogXCJsb2NhbGhvc3Q6OTIwMFwiXG4gICAgICBsb2c6IFwiaW5mb1wiXG4gICAgICBtaW5Tb2NrZXRzOiAxXG4gICAgICBzbmlmZkludGVydmFsOiA2MDAwMFxuICAgICAgc25pZmZPblN0YXJ0OiB0cnVlXG4gICAgICBzdWdnZXN0Q29tcHJlc3Npb246IHRydWVcbiAgY29uY3VyZW5jeTogMSAjIG51bWJlciBvZiBhY3RpdmUgYmF0Y2hlc1xuICBiYXRjaFNpemU6IDUwMCAjIGJhdGNoIHNpemVcbiAgY29tbWl0VGltZW91dDogMTAwMCAjIHdhaXQgdGltZSBiZWZvcmUgc2VuZGluZyBwYXJ0aWFsIGJhdGNoZXNcbiAgcmF0ZUxpbWl0OiAyMDAwXG4gIGJhdGNoSGFuZGxlcjogbnVsbFxuXG5jbGFzcyBFbGFzdGljUXVldWUgZXh0ZW5kcyBldmVudHMuRXZlbnRFbWl0dGVyXG5cbiAgY29uc3RydWN0b3I6IChjb25maWcgPSB7fSwgZXNDbGllbnQpIC0+XG4gICAgQGNvbmZpZyA9IEhvZWsuYXBwbHlUb0RlZmF1bHRzIGJhc2VDb25maWcsIGNvbmZpZ1xuICAgIEBxdWV1ZSA9IFtdXG4gICAgQGNoZWNrVGltZXIgPSBzZXRJbnRlcnZhbCBAY2hlY2ssIEBjb25maWcucmF0ZUxpbWl0XG4gICAgQGFzeW5jID0gYXN5bmMucXVldWUgQHRhc2ssIEBjb25maWcuY29uY3VyZW5jeVxuICAgIEBhc3luYy5kcmFpbiA9IEBkcmFpblxuICAgIEBjb3VudCA9IDFcbiAgICB1bmxlc3MgQGNvbmZpZz8uYmF0Y2hIYW5kbGVyP1xuICAgICAgaWYgZXNDbGllbnQ/XG4gICAgICAgIEBlc0NsaWVudCA9IGVzQ2xpZW50XG4gICAgICBlbHNlXG4gICAgICAgIEBzZXR1cF9lbGFzdGljKClcblxuICBkcmFpbjogPT5cbiAgICBpZiBAcXVldWUubGVuZ3RoIGlzIDBcbiAgICAgIEBlbWl0ICdkcmFpbidcblxuICBzZXR1cF9lbGFzdGljOiAtPlxuICAgIEBlc0NsaWVudCA9IG5ldyBlbGFzdGljc2VhcmNoLkNsaWVudCBAY29uZmlnLmVsYXN0aWNzZWFyY2guY2xpZW50XG5cbiAgcHVzaDogKHRhc2ssIGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBAcXVldWUucHVzaCB7IHRhc2s6IHRhc2ssIGNhbGxiYWNrOiBjYWxsYmFjayB9XG5cbiAgY2hlY2s6ID0+XG4gICAgaWYgQHF1ZXVlLmxlbmd0aCA+IDBcbiAgICAgIEBiYXRjaCgpXG5cbiAgYmF0Y2g6ID0+XG4gICAgc2l6ZSA9IEBxdWV1ZS5sZW5ndGhcbiAgICBzaXplID0gQGNvbmZpZy5iYXRjaFNpemUgaWYgc2l6ZSA+PSBAY29uZmlnLmJhdGNoU2l6ZVxuXG4gICAgaWYgc2l6ZSA+IDBcbiAgICAgIEBhc3luYy5wdXNoXG4gICAgICAgIGJhdGNoOiBAcXVldWUuc3BsaWNlKDAsIHNpemUpXG4gICAgICAgIGNvdW50OiBAY291bnQrKyxcbiAgICAgICAgQGJhdGNoQ29tcGxldGVcblxuICAgIGlmIEBxdWV1ZS5sZW5ndGggPiAwXG4gICAgICBjbGVhclRpbWVvdXQgQGJhdGNoVGltZW91dFxuICAgICAgQGJhdGNoVGltZW91dCA9XG4gICAgICAgIHNldFRpbWVvdXQgQGJhdGNoLCBAY29uZmlnLnJhdGVMaW1pdCArIEBjb25maWcuY29tbWl0VGltZW91dFxuXG4gIGJhdGNoQ29tcGxldGU6IChlcnIsIHJlc3AsIHRhc2spID0+XG4gICAgbWVzc2FnZXMgPSBbXVxuXG4gICAgaWYgcmVzcD8uaXRlbXM/XG4gICAgICByZXNwLml0ZW1zLmZvckVhY2ggKGl0ZW0pIC0+XG4gICAgICAgIG1lc3NhZ2VzW2l0ZW0/LmluZGV4Py5faWRdID0gaXRlbVxuXG4gICAgaWYgdGFzaz8uYmF0Y2g/XG4gICAgICB0YXNrLmJhdGNoLmZvckVhY2ggKGl0ZW0pIC0+XG4gICAgICAgIGlmIGl0ZW0/LmNhbGxiYWNrP1xuICAgICAgICAgIGlmIGl0ZW0/LnRhc2s/LmlkPyBhbmQgbWVzc2FnZXNbaXRlbT8udGFzaz8uaWRdP1xuICAgICAgICAgICAgbWVzc2FnZSA9IG1lc3NhZ2VzW2l0ZW0/LnRhc2s/LmlkXVxuICAgICAgICAgICAgaWYgWzIwMCwgMjAxXS5pbmRleE9mKG1lc3NhZ2U/LmluZGV4Py5zdGF0dXMpID4gLTFcbiAgICAgICAgICAgICAgaXRlbS5jYWxsYmFjayhudWxsLCBtZXNzYWdlKVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBpdGVtLmNhbGxiYWNrKG5ldyBFcnJvcihtZXNzYWdlLmluZGV4LmVycm9yKSwgbWVzc2FnZSlcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBpdGVtLmNhbGxiYWNrKGVyciwgcmVzcClcblxuICAgIHJldHVybiBAZW1pdCgnZXJyb3InLCBlcnIpIGlmIGVyclxuICAgIEBlbWl0ICdiYXRjaENvbXBsZXRlJywgcmVzcFxuXG4gIHRhc2s6ICh0YXNrLCBjYWxsYmFjaykgPT5cbiAgICBAZW1pdCAndGFzaycsIHRhc2tcbiAgICBpZiBAY29uZmlnPy5iYXRjaEhhbmRsZXI/XG4gICAgICBAY29uZmlnLmJhdGNoSGFuZGxlciB0YXNrLCBjYWxsYmFja1xuICAgIGVsc2VcbiAgICAgIEBlbGFzdGljU2VhcmNoQmF0Y2hIYW5kbGVyIHRhc2ssIGNhbGxiYWNrXG5cblxuICBlbGFzdGljU2VhcmNoQmF0Y2hIYW5kbGVyOiAodGFzaywgZG9uZSkgPT5cbiAgICBpbmRleCA9IFtdXG4gICAgZm9yIGtleSwgdmFsdWUgb2YgdGFzay5iYXRjaFxuICAgICAgaW5kZXgucHVzaFxuICAgICAgICBpbmRleDpcbiAgICAgICAgICBfaW5kZXg6IHZhbHVlLnRhc2suaW5kZXhcbiAgICAgICAgICBfdHlwZTogdmFsdWUudGFzay50eXBlXG4gICAgICAgICAgX2lkOiB2YWx1ZS50YXNrLmlkXG4gICAgICBpbmRleC5wdXNoIHZhbHVlLnRhc2suYm9keSBpZiB2YWx1ZS50YXNrLmJvZHk/XG5cbiAgICBAZXNDbGllbnQuYnVsayBib2R5OiBpbmRleCwgKGVyciwgcmVzKSAtPlxuICAgICAgcmV0dXJuIGRvbmUoZXJyLCBudWxsLCB0YXNrKSBpZiBlcnJcbiAgICAgIGRvbmUobnVsbCwgcmVzLCB0YXNrKVxuXG4gIGNsb3NlOiAtPlxuICAgIGlmIEBlc0NsaWVudD9cbiAgICAgIEBlc0NsaWVudC5jbG9zZSgpXG5cbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IEVsYXN0aWNRdWV1ZVxuIl19