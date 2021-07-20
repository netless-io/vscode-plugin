
import React from "react";
import loader from '@monaco-editor/loader';
import { editor } from "monaco-editor";
import { Room, RoomState } from "white-web-sdk";
import { emitter, Events } from "./index";

type EditorWrapperProps = {
    displayer?: Room | null;
    onEditorMounted: (ref: React.RefObject<HTMLDivElement>) => void;
}

type EditorWrapperState = {
    readonly: boolean;
}

const eventName = "onDidChangeModelContent"

export class EditorWrapper extends React.Component<EditorWrapperProps, EditorWrapperState> {
    public editorRef = React.createRef<HTMLDivElement>();
    public editor: editor.IStandaloneCodeEditor | null = null;
    private onExecuteEdits = false;

    constructor(props: EditorWrapperProps) {
        super(props);
        this.state = { 
            readonly: false
        };
        loader.config({
            "vs/nls": {
                availableLanguages: {
                    "*": "zh-cn",
                }
            }
        });
    }
    
    async componentDidMount() {
        emitter.on("onRoomStateChanged", state => {
            if (state.memberState) {
                if (state.memberState.currentApplianceName !== "clicker") {
                    this.setState({ readonly: true });
                } else {
                    this.setState({ readonly: false });
                }
            }
        })
        const monaco = await loader.init();
        if (this.editorRef.current) {
            const editor = monaco.editor.create(this.editorRef.current, {
                language: "javascript",
                theme: "vs-dark",
                automaticLayout: true
            });
            cleanEditorLoader(editor);
            this.editor = editor;
            this.props.onEditorMounted(this.editorRef);
            editor.updateOptions({ readOnly: this.state.readonly });
            editor.onDidFocusEditorWidget(() => {
                emitter.emit(Events.setDisplayerDisableInput, true)
            });
            editor.onDidBlurEditorWidget(() => {
                emitter.emit(Events.setDisplayerDisableInput, false)
            });
            editor.onDidChangeModelContent(e => {
                if (!this.onExecuteEdits) {
                    emitter.emit(Events.dispatchMagixEvent, {
                        event: eventName,
                        payload: JSON.stringify(e.changes)
                    });
                    // MonacoPluginWrapper.monacoPluginInstance?.setAttributes({
                    //     modelValue: editor.getModel()?.getValue()
                    // })
                }
            });
            emitter.emit(Events.registerMagixListener, { event: eventName });
            emitter.on(eventName, (ev) => {
                const changes = JSON.parse(ev.payload);
                this.onExecuteEdits = true;
                editor.executeEdits(ev.authorId, changes);
                this.onExecuteEdits = false;
            });
        }
    }

    render() {
        if (this.state) {
            this.editor?.updateOptions({ readOnly: this.state.readonly });
        }
        return <div ref={this.editorRef} style={{ width: "100%", height: "100%" }}></div>
    }
}

const cleanEditorLoader = (editor: any) => {
    // @ts-ignore
    if (editor && "function" === typeof define && define.amd) {
        // @ts-ignore
        delete define.amd;
    }
}
