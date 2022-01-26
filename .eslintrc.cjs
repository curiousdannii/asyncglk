module.exports = {
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    root: true,
    rules: {
        'brace-style': ['error', 'stroustrup', {'allowSingleLine': true}],
        'comma-dangle': ['error', 'always-multiline'],
        curly: ['error'],
        eqeqeq: ['error', 'always', {null: 'ignore'}],
        indent: ['error', 4, {SwitchCase: 1}],
        'linebreak-style': ['error', 'unix'],
        quotes: ['error', 'single'],
        semi: ['error', 'never'],
        '@typescript-eslint/no-empty-function': ['off'],
        '@typescript-eslint/no-explicit-any': ['off'],
        '@typescript-eslint/no-non-null-assertion': ['off'],
        '@typescript-eslint/no-unused-vars': ['error', {'args': 'none'}],
    },
}