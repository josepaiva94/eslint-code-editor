<template>
  <div id="editor">
    <MonacoEditor
      id="editor"
      ref="editor"
      v-model="code"
      :theme="theme"
      :language="language"
      :options="config"
      @editorWillMount="editorDidMount"
    ></MonacoEditor>
  </div>
</template>

<script>
import MonacoEditor from 'vue-monaco';

import { computeKey, createQuickfixCodeAction, ensurePositiveInt } from './utils';

export default {
  name: 'EslintCodeEditor',
  components: {
    MonacoEditor,
  },

  model: {
    prop: 'value',
    event: 'input',
  },

  props: {
    config: {
      type: Object,
      default: () => ({})
    },
    theme: {
      type: String,
      default: 'vs',
    },
    lintConfig: {
      type: Object,
      default: () => ({})
    },
    filename: {
      type: String,
      default: 'index.js',
    },
    preprocess: {
      type: Function,
      default: null,
      required: false,
    },
    postprocess: {
      type: Function,
      default: null,
      required: false,
    },
    language: {
      type: String,
      default: 'javascript',
    },
    value: {
      type: String,
      default: '',
    }
  },
  data() {
    return {
      editing: false,
      linter: null,
      code: this.value,
      fixedCode: this.value,
      messages: [],
      editorMessageMap: new Map(),
      codeActionProviderDisposable: null
    };
  },
  computed: {

    codeActionProvider() {
      return {
        provideCodeActions: (model, _range, context) => {
          const messageMap = this.editorMessageMap.get(model.uri);
          if (context.only !== 'quickfix' || !messageMap) {
            return {
              actions: [],
              dispose() {
                /* nop */
              },
            };
          }
          const actions = [];
          for (const marker of context.markers) {
            const message = messageMap.get(computeKey(marker));
            if (!message) {
              continue;
            }
            if (message.fix) {
              actions.push(
                createQuickfixCodeAction(
                  `Fix this ${message.ruleId} problem`,
                  marker,
                  model,
                  message.fix,
                ),
              );
            }
            if (message.suggestions) {
              for (const suggestion of message.suggestions) {
                actions.push(
                  createQuickfixCodeAction(
                    `${suggestion.desc} (${message.ruleId})`,
                    marker,
                    model,
                    suggestion.fix,
                  ),
                );
              }
            }
          }
          return {
            actions,
            dispose() {
              /* nop */
            },
          };
        },
      }
    },
  },

  async mounted() {
    // load linter asynchronously.
    const { default: Linter } = await import('eslint4b');
    this.linter = new Linter();

    // register action provider
    const monaco = this.$refs.editor.monaco;
    this.codeActionProviderDisposable = monaco.languages.registerCodeActionProvider(
      this.language,
      this.codeActionProvider,
    );
  },

  watch: {
    linter() {
      this.invalidate();
    },
    code(value) {
      this.updateCode(value);
      this.$emit('input', value);
    },
    config: {
      handler() {
        this.invalidate();
      },
      deep: true,
    },
    filename() {
      this.invalidate();
    },
    messages(value) {
      const editor = this.$refs.editor.getOriginalEditor();
      if (editor != null) {
        this.updateMarkers(value, true);
      }
    },
    language(value) {
      const monaco = this.$refs.editor.monaco;
      if (monaco == null) {
        // Skip because the initialization logic does this.
        return;
      }
      (async () => {
        // Load the language editor of the current language.
        await this.loadLanguage(value);
        // Skip if the language is not latest
        if (value !== this.language) {
          return;
        }
        // Set the language to the current editors.
        const editor = this.$refs.editor.getOriginalEditor();
        monaco.editor.setModelLanguage(editor.getModel(), value);
        // dispose(this.codeActionProviderDisposable)
        this.codeActionProviderDisposable = monaco.languages.registerCodeActionProvider(
          this.language,
          this.codeActionProvider,
        );
      })().catch(error => {
        console.error('Failed to set the language "%s":', value, error)
      });
    },
  },

  methods: {
    editorDidMount() {
      const monaco = this.$refs.editor.monaco;

      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
      });

      monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
      monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

      monaco.languages.registerCompletionItemProvider('javascript', {
        provideCompletionItems: () => ({
          suggestions: [
            {
              name: 'ifelse',
              label: 'ifelse',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: [
                'if (${1:condition}) {',
                '\t$0',
                '} else {',
                '\t',
                '}',
              ].join('\n'),
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'If-Else Statement',
            },
          ],
        }),
      });
    },

    messageToMarker(message) {
      const monaco = this.$refs.editor.monaco;
      const rule = message.ruleId && this.linter.getRules().get(message.ruleId);
      const docUrl = rule && rule.meta && rule.meta.docs && rule.meta.docs.url;
      const startLineNumber = ensurePositiveInt(message.line, 1);
      const startColumn = ensurePositiveInt(message.column, 1);
      const endLineNumber = ensurePositiveInt(message.endLine, startLineNumber);
      const endColumn = ensurePositiveInt(message.endColumn, startColumn + 1);
      const code = docUrl
        ? { value: message.ruleId, link: docUrl }
        : message.ruleId || 'FATAL';
      return {
        code,
        severity: monaco.MarkerSeverity.Error,
        source: 'ESLint',
        message: message.message,
        startLineNumber,
        startColumn,
        endLineNumber,
        endColumn,
      };
    },

    updateValue(value) {
      const editor = this.$refs.editor.getOriginalEditor();
      const model = editor.getModel();
      if (model != null && value !== model.getValue()) {
        model.setValue(value);
      }
    },
    
    updateCode(value) {
      this.updateValue(value);
      this.invalidate();
    },

    updateMarkers(messages, storeMessageMap) {
      const monaco = this.$refs.editor.monaco;
      const editor = this.$refs.editor.getOriginalEditor();
      const model = editor.getModel();
      const id = editor.getId();
      this.editorMessageMap.delete(model.uri);
      const markers = [];
      let messageMap = null;
      if (storeMessageMap) {
        messageMap = new Map();
        this.editorMessageMap.set(model.uri, messageMap);
      }
      for (const message of messages) {
        const marker = this.messageToMarker(message);
        markers.push(marker);
        if (storeMessageMap) {
          messageMap.set(computeKey(marker), message);
        }
      }
      monaco.editor.setModelMarkers(model, id, markers);
    },

    invalidate() {
      const editor = this.$refs.editor.getOriginalEditor();
      if (editor != null && !this.editing) {
        this.editing = true;
        setTimeout(() => {
          this.lint();
          this.editing = false;
        }, 667);
      }
    },
    
    lint() {
      const editor = this.$refs.editor.getOriginalEditor();
      if (editor == null || this.linter == null) {
        return;
      }
      this.editorMessageMap.clear();
      const model = editor.getModel();
      const code = model.getValue();
      // Lint
      try {
        this.messages = this.linter.verify(code, this.lintConfig, {
          filename: this.filename,
          preprocess: this.preprocess,
          postprocess: this.postprocess,
        });
      } catch (err) {
        this.messages = [
          {
            fatal: true,
            severity: 2,
            message: err.message,
            line: 1,
            column: 0,
          },
        ];
      }
      // Fix
      try {
        const ret = this.linter.verifyAndFix(code, this.lintConfig, {
          filename: this.filename
        });
        this.fixedCode = ret.fixed ? ret.output : code;
      } catch (err) {
        this.fixedCode = code;
      }
      this.$emit('change', {
        code,
        messages: this.messages,
        fixedCode: this.fixedCode,
      });
    },

    dispose(x) {
      if (x == null) {
        return
      }
      if (x.getOriginalEditor) {
        this.dispose(x.getOriginalEditor())
      }
      if (x.getModifiedEditor) {
        this.dispose(x.getModifiedEditor())
      }
      if (x.getModel) {
        this.dispose(x.getModel())
      }
      if (x.dispose) {
        x.dispose()
      }
    }
  },
};
</script>

<style>
#editor {
  height: 100%;
  width: 100%;
}
</style>
