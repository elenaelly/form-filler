class DeferredPromise {
	_status = 'pending';

	_promise_resolve = null;
	_promise_reject = null;
	_promise = new Promise((resolve, reject) => {
		this._promise_resolve = resolve;
		this._promise_reject = reject;
	});

	isPending() {
		return this._status == 'pending';
	}

	isResolved() {
		return this._status == 'resolved';
	}

	isRejected() {
		return this._status == 'rejected';
	}

	resolve(data) {
		this._status = 'resolved';
		this._promise_resolve(data);
	}

	reject(data) {
		this._status = 'rejected';
		this._promise_reject(data);
	}

	then(callback) {
		return this._promise.then(callback);
	}

	catch(callback) {
		return this._promise.catch(callback);
	}

	promise() {
		return this._promise;
	}
}
