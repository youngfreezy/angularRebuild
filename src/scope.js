/* jshint globalstrict: true */

'use strict';

//to ensure that the .last value is unique:

function initWatchVal() {

}

function Scope() {
  //$$ means private to my angular framework
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
  this.$$asyncQueue = [];
  this.$$applyAsyncQueue = [];
  this.$$phase = null;
  this.$$applyAsyncId = null;
}

//define the $watch function

Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function () {},
    //check if items in an object or array are equal.  this we can notice
    // if an item is pushed to an array, allows changes to be "watched"
    valueEq: !!valueEq,
    last: initWatchVal
  };

  this.$$watchers.push(watcher);
  this.$$lastDirtyWatch = null;
};

Scope.prototype.$$areEqual = function (newValue, oldValue, valueEq) {
  if (valueEq) {
    return _.isEqual(newValue, oldValue);
  } else {
    return newValue === oldValue || (typeof newValue === 'number' && typeof oldValue === 'number' && isNaN(newValue) && isNaN(oldValue));
  }
};
//iterates over watchers and calls their respective listener functions
// has to remember last value of each watch function to listen for changes
Scope.prototype.$digest = function () {
  var limit = 10;
  var dirty;
  this.$$lastDirtyWatch = null;
  this.$beginPhase("$digest");

  if (this.$$applyAsyncId) {
    clearTimeout(this.$$applyAsyncId);
    this.$$flushApplyAsync();
  }

  do {
    //handle asynchronicity. this ensures the function is invoked later, but still in the same digest. 

    while (this.$$asyncQueue.length) {
      var asyncTask = this.$$asyncQueue.shift();
      asyncTask.scope.$eval(asyncTask.expression);
    }
    dirty = this.$$digestOnce();
    if ((dirty || this.$$asyncQueue.length) && !(limit--)) {
      this.clearPhase();
      throw "10 digest iterations reached";
    }
  } while (dirty || this.$$asyncQueue.length);
  this.$clearPhase();
};



Scope.prototype.$$digestOnce = function () {
  var self = this;
  var newValue, oldValue, dirty;
  //for each watcher, we compare return value of watch functio with last attribute
  // if anything has changed, we call the listener function, passing in values and scope. 
  // every watch function is called during every $digest. 
  //good idea to pay attention to number of watches for this reason.
  _.forEach(this.$$watchers, function (watcher) {
    newValue = watcher.watchFn(self);
    oldValue = watcher.last;
    //make a deep copy
    if (!self.$$areEqual(newValue, oldValue, watcher.valueEq)) {
      self.$$lastDirtyWatch = watcher;
      watcher.last = (watcher.valueEq ? _.cloneDeep(newValue) : newValue);
      //check if the old value is the initial value, replace it if so.
      watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue),
        self);

      //it's been changed
      dirty = true;
    } else if (self.$$lastDirtyWatch === watcher) {
      return false;
    }


  });
  return dirty;
};

Scope.prototype.$eval = function (expr, locals) {

  return expr(this, locals);

};

//we can execute code that is unaware of Angular.
// as long as code is wrapped in apply, we can be sure any watches will 
// pick up the changes.
Scope.prototype.$apply = function (expr) {
  try {
    this.$beginPhase("$apply");
    return this.$eval(expr);
  } finally {
    this.$clearPhase();
    this.$digest();
  }
};

Scope.prototype.$applyAsync = function (expr) {
  var self = this;
  self.$$applyAsyncQueue.push(function () {
    self.$eval(expr);
  });

  //check the applyAsyncId attribute and maintain its state when the job is scheduled and
  //when it finishes
  if (self.$$applyAsyncId === null) {
    self.$$applyAsyncId = setTimeout(function () {
      self.$apply(_.bind(self.$$flushApplyAsync, self));

    }, 0);
  }
};

Scope.prototype.$evalAsync = function (expr) {
  //digest scheduled if no async tasks scheduled yet.

  var self = this;
  if (!self.$$phase && !self.$$asyncQueue.length) {
    setTimeout(function () {
      if (self.$$asyncQueue.length) {
        self.$digest();
      }
    }, 0);
  }
  self.$$asyncQueue.push({
    scope: self,
    expression: expr
  });
};

Scope.prototype.$beginPhase = function (phase) {
  if (this.$$phase) {
    throw this.$$phase + 'already in progress.';
  }

  this.$$phase = phase;
};

Scope.prototype.$clearPhase = function () {
  this.$$phase = null;
};