enum CallbackType {
    On,
    Once,
}

class CallbackInfo {
    type: CallbackType;
    addr: u32;

    constructor(type: CallbackType, addr: u32) {
        this.type = type;
        this.addr = addr;
    }
}

export const defaultMaxListeners = 10;

export class EventEmitter<T> {
    private maxListeners: i32 = defaultMaxListeners;
    private events: Map<string, Array<CallbackInfo>> = new Map();

    emit(event: string, data: T): bool {
        if (this.events.has(event)) {
            const eventFunctions = this.events.get(event);
            if (eventFunctions.length == 0) {
                return false;
            }
            let i = 0;
            while (i < eventFunctions.length) {
                if (eventFunctions[i].type == CallbackType.Once) {
                    call_indirect(eventFunctions[i].addr, data);
                    eventFunctions.splice(i, 1);
                } else {
                    call_indirect(eventFunctions[i].addr, data);
                    i++;
                }
            }
            return true;
        }

        return false;
    }

    private _onType(
        type: CallbackType,
        event: string,
        callback: (data: T) => void
    ): this {
        if (!this.events.has(event)) {
            this.events.set(event, [
                new CallbackInfo(type, load<u32>(changetype<usize>(callback))),
            ]);
        } else {
            const eventFunctions = this.events.get(event);
            if (eventFunctions.length > this.maxListeners) {
                throw new Error(
                    `MaxListenersExceededError: Possible EventEmitter memory leak detected. ${eventFunctions.length} ${event} listeners added to [EventEmitter]. Use emitter.setMaxListeners() to increase limit`
                );
            }
            eventFunctions.push(
                new CallbackInfo(type, load<u32>(changetype<usize>(callback)))
            );
        }
        return this;
    }

    @inline
    on(event: string, callback: (data: T) => void): this {
        return this._onType(CallbackType.On, event, callback);
    }

    @inline
    addListener(event: string, callback: (data: T) => void): this {
        return this.on(event, callback);
    }

    @inline
    once(event: string, callback: (data: T) => void): this {
        return this._onType(CallbackType.Once, event, callback);
    }

    private _prepend(
        type: CallbackType,
        event: string,
        callback: (data: T) => void
    ): this {
        const events = this.events;
        if (!events.has(event)) {
            events.set(event, [
                new CallbackInfo(type, load<u32>(changetype<usize>(callback))),
            ]);
        } else {
            const eventFunctions = events.get(event);
            if (eventFunctions.length > this.maxListeners) {
                throw new Error(
                    `MaxListenersExceededError: Possible EventEmitter memory leak detected. ${eventFunctions.length} ${event} listeners added to [EventEmitter]. Use emitter.setMaxListeners() to increase limit`
                );
            }
            eventFunctions.unshift(
                new CallbackInfo(type, load<u32>(changetype<usize>(callback)))
            );
        }

        return this;
    }

    @inline
    prependListener(event: string, callback: (data: T) => void): this {
        return this._prepend(CallbackType.On, event, callback);
    }

    @inline
    prependOnceListener(event: string, callback: (data: T) => void): this {
        return this._prepend(CallbackType.Once, event, callback);
    }

    @inline
    removeListener(event: string): this {
        this.events.delete(event);
        return this;
    }

    removeListeners(events: string[]): this {
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            this.removeListener(event);
        }
        return this;
    }

    @inline
    removeAllListeners(): this {
        this.events.clear();
        return this;
    }

    @inline
    eventNames(): Array<string> {
        return this.events.keys();
    }

    @inline
    getMaxListeners(): number {
        return this.maxListeners;
    }

    @inline
    setMaxListeners(n: u32): void {
        this.maxListeners = n;
    }

    @inline
    listenerCount(event: string): u32 {
        if (!this.events.has(event)) return 0;
        return this.events.get(event).length;
    }
}
