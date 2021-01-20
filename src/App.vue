<template>
  <div id="app">
    <eslint-code-editor
      id="editor"
      ref="editor"
      v-model="code"
      theme="vs-dark"
      :language="language"
      :config="config"
      :lint-config="lintConfig"
    ></eslint-code-editor>
  </div>
</template>

<script>
import { editorOptions } from './config/editor.options';
import lintOptions from './config/lint.options';

import EslintCodeEditor from '@/components/eslint-code-editor/EslintCodeEditor';

export default {
  name: 'App',
  components: {
    EslintCodeEditor,
  },

  data() {
    return {
      language: 'javascript',
      code: 'const noop = () => {}',
      config: {
        ...editorOptions
      },
      lintConfig: {
        ...lintOptions
      },
    };
  },

  watch: {
    code(value) {
      console.log(value);
    }
  }
};
</script>

<style>
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  margin: 0;
  padding: 0;
}
</style>
