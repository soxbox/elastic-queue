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
    this.elasticSearch = bind(this.elasticSearch, this);
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
      return this.elasticSearch(task, callback);
    }
  };

  ElasticQueue.prototype.elasticSearch = function(task, done) {
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

//# sourceMappingURL=data:application/json;base64,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QVcsR0FBWCxFQUFnQixJQUFoQixFQUYwQjtJQUFBLENBQTVCLEVBVmE7RUFBQSxDQXhFZixDQUFBOztBQUFBLHlCQXNGQSxLQUFBLEdBQU8sU0FBQSxHQUFBO0FBQ0wsSUFBQSxJQUFHLHFCQUFIO2FBQ0UsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLENBQUEsRUFERjtLQURLO0VBQUEsQ0F0RlAsQ0FBQTs7c0JBQUE7O0dBRnlCLE1BQU0sQ0FBQyxhQXBCbEMsQ0FBQTs7QUFBQSxNQWdITSxDQUFDLE9BQVAsR0FBaUIsT0FBQSxHQUFVLFlBaEgzQixDQUFBIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiZWxhc3RpY3NlYXJjaCA9IHJlcXVpcmUgJ2VsYXN0aWNzZWFyY2gnXG5Ib2VrID0gcmVxdWlyZSAnaG9laydcbmFzeW5jID0gcmVxdWlyZSAnYXN5bmMnXG5ldmVudHMgPSByZXF1aXJlICdldmVudHMnXG5cbmJhc2VDb25maWcgPVxuICBlbGFzdGljc2VhcmNoOlxuICAgIGNsaWVudDpcbiAgICAgIGhvc3Q6IFwibG9jYWxob3N0OjkyMDBcIlxuICAgICAgbG9nOiBcImluZm9cIlxuICAgICAgbWluU29ja2V0czogMVxuICAgICAgc25pZmZJbnRlcnZhbDogNjAwMDBcbiAgICAgIHNuaWZmT25TdGFydDogdHJ1ZVxuICAgICAgc3VnZ2VzdENvbXByZXNzaW9uOiB0cnVlXG4gIGNvbmN1cmVuY3k6IDEgIyBudW1iZXIgb2YgYWN0aXZlIGJhdGNoZXNcbiAgYmF0Y2hTaXplOiA1MDAgIyBiYXRjaCBzaXplXG4gIGNvbW1pdFRpbWVvdXQ6IDEwMDAgIyB3YWl0IHRpbWUgYmVmb3JlIHNlbmRpbmcgcGFydGlhbCBiYXRjaGVzXG4gIHJhdGVMaW1pdDogMjAwMFxuICBiYXRjaEhhbmRsZXI6IG51bGxcblxuY2xhc3MgRWxhc3RpY1F1ZXVlIGV4dGVuZHMgZXZlbnRzLkV2ZW50RW1pdHRlclxuXG4gIGNvbnN0cnVjdG9yOiAoY29uZmlnID0ge30sIGVzQ2xpZW50KSAtPlxuICAgIEBjb25maWcgPSBIb2VrLmFwcGx5VG9EZWZhdWx0cyBiYXNlQ29uZmlnLCBjb25maWdcbiAgICBAcXVldWUgPSBbXVxuICAgIEBjaGVja1RpbWVyID0gc2V0SW50ZXJ2YWwgQGNoZWNrLCBAY29uZmlnLnJhdGVMaW1pdFxuICAgIEBhc3luYyA9IGFzeW5jLnF1ZXVlIEB0YXNrLCBAY29uZmlnLmNvbmN1cmVuY3lcbiAgICBAYXN5bmMuZHJhaW4gPSBAZHJhaW5cbiAgICBAY291bnQgPSAxXG4gICAgdW5sZXNzIEBjb25maWc/LmJhdGNoSGFuZGxlcj9cbiAgICAgIGlmIGVzQ2xpZW50P1xuICAgICAgICBAZXNDbGllbnQgPSBlc0NsaWVudFxuICAgICAgZWxzZVxuICAgICAgICBAc2V0dXBfZWxhc3RpYygpXG5cbiAgZHJhaW46ID0+XG4gICAgaWYgQHF1ZXVlLmxlbmd0aCBpcyAwXG4gICAgICBAZW1pdCAnZHJhaW4nXG5cbiAgc2V0dXBfZWxhc3RpYzogLT5cbiAgICBAZXNDbGllbnQgPSBuZXcgZWxhc3RpY3NlYXJjaC5DbGllbnQgQGNvbmZpZy5lbGFzdGljc2VhcmNoLmNsaWVudFxuXG4gIHB1c2g6ICh0YXNrLCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQHF1ZXVlLnB1c2ggeyB0YXNrOiB0YXNrLCBjYWxsYmFjazogY2FsbGJhY2sgfVxuXG4gIGNoZWNrOiA9PlxuICAgIGlmIEBxdWV1ZS5sZW5ndGggPiAwXG4gICAgICBAYmF0Y2goKVxuXG4gIGJhdGNoOiA9PlxuICAgIHNpemUgPSBAcXVldWUubGVuZ3RoXG4gICAgc2l6ZSA9IEBjb25maWcuYmF0Y2hTaXplIGlmIHNpemUgPj0gQGNvbmZpZy5iYXRjaFNpemVcblxuICAgIGlmIHNpemUgPiAwXG4gICAgICBAYXN5bmMucHVzaFxuICAgICAgICBiYXRjaDogQHF1ZXVlLnNwbGljZSgwLCBzaXplKVxuICAgICAgICBjb3VudDogQGNvdW50KyssXG4gICAgICAgIEBiYXRjaENvbXBsZXRlXG5cbiAgICBpZiBAcXVldWUubGVuZ3RoID4gMFxuICAgICAgY2xlYXJUaW1lb3V0IEBiYXRjaFRpbWVvdXRcbiAgICAgIEBiYXRjaFRpbWVvdXQgPVxuICAgICAgICBzZXRUaW1lb3V0IEBiYXRjaCwgQGNvbmZpZy5yYXRlTGltaXQgKyBAY29uZmlnLmNvbW1pdFRpbWVvdXRcblxuICBiYXRjaENvbXBsZXRlOiAoZXJyLCByZXNwLCB0YXNrKSA9PlxuICAgIG1lc3NhZ2VzID0gW11cblxuICAgIGlmIHJlc3A/Lml0ZW1zP1xuICAgICAgcmVzcC5pdGVtcy5mb3JFYWNoIChpdGVtKSAtPlxuICAgICAgICBtZXNzYWdlc1tpdGVtPy5pbmRleD8uX2lkXSA9IGl0ZW1cblxuICAgIGlmIHRhc2s/LmJhdGNoP1xuICAgICAgdGFzay5iYXRjaC5mb3JFYWNoIChpdGVtKSAtPlxuICAgICAgICBpZiBpdGVtPy5jYWxsYmFjaz9cbiAgICAgICAgICBpZiBpdGVtPy50YXNrPy5pZD8gYW5kIG1lc3NhZ2VzW2l0ZW0/LnRhc2s/LmlkXT9cbiAgICAgICAgICAgIG1lc3NhZ2UgPSBtZXNzYWdlc1tpdGVtPy50YXNrPy5pZF1cbiAgICAgICAgICAgIGlmIFsyMDAsIDIwMV0uaW5kZXhPZihtZXNzYWdlPy5pbmRleD8uc3RhdHVzKSA+IC0xXG4gICAgICAgICAgICAgIGl0ZW0uY2FsbGJhY2sobnVsbCwgbWVzc2FnZSlcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgaXRlbS5jYWxsYmFjayhuZXcgRXJyb3IobWVzc2FnZS5pbmRleC5lcnJvciksIG1lc3NhZ2UpXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgaXRlbS5jYWxsYmFjayhlcnIsIHJlc3ApXG5cbiAgICByZXR1cm4gQGVtaXQoJ2Vycm9yJywgZXJyKSBpZiBlcnJcbiAgICBAZW1pdCAnYmF0Y2hDb21wbGV0ZScsIHJlc3BcblxuICB0YXNrOiAodGFzaywgY2FsbGJhY2spID0+XG4gICAgQGVtaXQgJ3Rhc2snLCB0YXNrXG4gICAgaWYgQGNvbmZpZz8uYmF0Y2hIYW5kbGVyP1xuICAgICAgQGNvbmZpZy5iYXRjaEhhbmRsZXIgdGFzaywgY2FsbGJhY2tcbiAgICBlbHNlXG4gICAgICBAZWxhc3RpY1NlYXJjaCB0YXNrLCBjYWxsYmFja1xuXG5cbiAgZWxhc3RpY1NlYXJjaDogKHRhc2ssIGRvbmUpID0+XG4gICAgaW5kZXggPSBbXVxuICAgIGZvciBrZXksIHZhbHVlIG9mIHRhc2suYmF0Y2hcbiAgICAgIGluZGV4LnB1c2hcbiAgICAgICAgaW5kZXg6XG4gICAgICAgICAgX2luZGV4OiB2YWx1ZS50YXNrLmluZGV4XG4gICAgICAgICAgX3R5cGU6IHZhbHVlLnRhc2sudHlwZVxuICAgICAgICAgIF9pZDogdmFsdWUudGFzay5pZFxuICAgICAgaW5kZXgucHVzaCB2YWx1ZS50YXNrLmJvZHkgaWYgdmFsdWUudGFzay5ib2R5P1xuXG4gICAgQGVzQ2xpZW50LmJ1bGsgYm9keTogaW5kZXgsIChlcnIsIHJlcykgLT5cbiAgICAgIHJldHVybiBkb25lKGVyciwgbnVsbCwgdGFzaykgaWYgZXJyXG4gICAgICBkb25lKG51bGwsIHJlcywgdGFzaylcblxuICBjbG9zZTogLT5cbiAgICBpZiBAZXNDbGllbnQ/XG4gICAgICBAZXNDbGllbnQuY2xvc2UoKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBFbGFzdGljUXVldWVcbiJdfQ==