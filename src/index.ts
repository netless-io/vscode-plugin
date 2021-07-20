import { EventEmitter2 } from "eventemitter2";
import type { InvisiblePluginContext, Room, Displayer, RoomState, InvisiblePlugin } from "white-web-sdk";

export type MonacoPluginAttributes = {
    modelValue?: string,
    [key: string]: any
}

export type InsertOptions = {
    readonly room: Room;
}

export enum Events {
    setDisplayerDisableInput = "setDisplayerDisableInput",
    onRoomStateChanged = "onRoomStateChanged",
    setAttributes = "setAttributes",
    dispatchMagixEvent = "dispatchMagixEvent",
    registerMagixListener = "registerMagixListener",
    canOperate = "canOperate",
}

export const emitter = new EventEmitter2();

const GloblInvisiblePlugin = (window as any).InvisiblePlugin as typeof InvisiblePlugin;

export class MonacoPlugin extends GloblInvisiblePlugin<{}> {
    public static readonly kind: string = "MonacoPlugin";
        public static displayer: Displayer;

        constructor(context: InvisiblePluginContext) {
            super(context);
        }

        public displayerStateListener = (state: RoomState) => {
            emitter.emit(Events.onRoomStateChanged, state);
            if (state.memberState) {
                emitter.emit(Events.canOperate, this?.canOperate);
            }
        }

        public static onCreate(plugin: MonacoPlugin) {
            MonacoPlugin.displayer = plugin.displayer;
            MonacoPlugin.displayer.callbacks.on("onRoomStateChanged", plugin.displayerStateListener);
            plugin.displayerStateListener(plugin.displayer.state as RoomState);
            plugin.addEventListener();
        }

        public eventListener = (event: string | string[], payload: any) => {
            switch (event) {
                case Events.setDisplayerDisableInput: {
                    (this.displayer as Room).disableDeviceInputs = payload;
                    break;
                }
                case Events.setAttributes: {
                    this.setAttributes(payload);
                    break;
                }
                case Events.dispatchMagixEvent: {
                    (this.displayer as Room).dispatchMagixEvent(payload.event, payload.payload);
                    break;
                }
                case Events.registerMagixListener: {
                    const room = (this.displayer as Room);
                    const magixEventName = payload.event;
                    room.addMagixEventListener(magixEventName, (ev) => {
                        if (ev.authorId !== room.observerId) {
                            emitter.emit(magixEventName, ev);
                        }
                    });
                    break;
                }
                default:
                    break;
            }
        }

        public addEventListener(): void {
            emitter.onAny(this.eventListener);
        }

        private get canOperate(): boolean {
            return (this.displayer as Room).state.memberState.currentApplianceName === "clicker";
        }

        public onDestroy() {
            emitter.removeAllListeners();
            this.displayer.callbacks.off("onRoomStateChanged", this.displayerStateListener);
        }
}

export * from "./wrapper";