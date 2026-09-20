export default {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    schema: [],
    messages: {
      parameter: 'Place each function parameter on a new line.',
      closing: 'Place the closing parameter parenthesis on a new line.',
    },
  },
  create(context) {
    const source = context.sourceCode;

    function check(node) {
      if (!node.params.length) return;
      const first = node.params[0];
      // arrow-parens supplies parentheses for bare single-parameter arrows.
      if (source.getTokenBefore(first)?.value !== '(') return;

      const indent = source.lines[node.loc.start.line - 1].match(/^\s*/)[0];
      const closing = source.getTokenAfter(node.params.at(-1), token => token.value === ')');
      for (const token of [...node.params, closing]) {
        const previous = source.getTokenBefore(token, { includeComments: true });
        if (previous.loc.end.line !== token.loc.start.line) continue;
        const isClosing = token === closing;
        context.report({
          node: token,
          messageId: isClosing ? 'closing' : 'parameter',
          fix: fixer => fixer.replaceTextRange(
            [previous.range[1], token.range[0]],
            '\n' + indent + (isClosing ? '' : '  '),
          ),
        });
      }
    }

    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression, TSDeclareFunction, TSEmptyBodyFunctionExpression, TSFunctionType, TSConstructorType, TSCallSignatureDeclaration, TSConstructSignatureDeclaration, TSMethodSignature': check,
    };
  },
};
