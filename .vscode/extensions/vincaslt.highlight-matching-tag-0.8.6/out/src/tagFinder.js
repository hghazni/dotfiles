"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moo = require("moo");
const blockState = (closingChar) => {
    return {
        blockClose: { match: new RegExp(`\\${closingChar}`), pop: 1 },
        bracketOpen: { match: /\{/, push: 'brackets' },
        parenthesisOpen: { match: /\(/, push: 'parenthesis' },
        squareBracketsOpen: { match: /\[/, push: 'squareBrackets' },
        string: { match: /(?:(?:"(?:\\["\\]|[^\n"\\])*")|(?:'(?:\\['\\]|[^\n'\\])*'))/ },
        tagOpening: { match: /<(?!\/)(?=>|\w)[^>\s\}\)\]\'\"]*(?=[^]*>)(?=\s|>)/, push: 'inTag' },
        tagClosing: /<\/\S*?>/,
        ignore: {
            // Ignore everything like main, plus block and string symbols
            match: new RegExp(`(?:[^])+?(?=<(?:(?=\/|\\w|>)\S*)|\\${closingChar}|\\{|\\[|\\(|\\'|\\")`),
            lineBreaks: true
        }
    };
};
const lexer = moo.states({
    main: {
        // Try to match anything that looks like a tag
        tagOpening: { match: /<(?!\/)(?=>|\w)[^>\s\}\)\]\'\"]*(?=[^]*>)(?=\s|>)/, push: 'inTag' },
        // Closing tag
        tagClosing: /<\/\S*?>/,
        // Anything that doesn't look like a tag is ignored
        ignore: { match: /(?:[^])+?(?=<(?:(?=\/|\w|>)\S*))/, lineBreaks: true },
        ignoreTheRest: { match: /[^]+/, lineBreaks: true }
    },
    inTag: {
        // Closes tag and returns to main state
        tagSelfClose: { match: /\/>/, pop: 1 },
        // Closes tag and returns to main state
        closeTag: { match: />/, pop: 1 },
        // Attribute name
        attribute: /[^\s{"'[(=>]+/,
        // Equals not in a block -> start attribute value
        equals: { match: /=\s*/, push: 'attributeValue' },
        // New line, effect is the same as whitespace
        newLine: { match: /\r?\n/, lineBreaks: true },
        // Whitespace separates attributes mainly
        whiteSpace: /[ \t]+/,
        bracketOpen: { match: /\{/, push: 'brackets' },
        parenthesisOpen: { match: /\(/, push: 'parenthesis' },
        squareBracketsOpen: { match: /\[/, push: 'squareBrackets' }
    },
    attributeValue: {
        // String attribute value (single or double quotes) TODO: ` <- this
        string: {
            match: /(?:(?:"(?:\\["\\]|[^\n"\\])*")|(?:'(?:\\['\\]|[^\n'\\])*'))/,
            pop: 1
        },
        // BRACKETS
        bracketOpen: { match: /\{/, push: 'brackets' },
        parenthesisOpen: { match: /\(/, push: 'parenthesis' },
        squareBracketsOpen: { match: /\[/, push: 'squareBrackets' },
        // Presumably number attribute value
        value: { match: /[^\s>]+/ },
        // Pop the state, there is no value after this point
        tagValueOver: { match: /(?=[\s>])/, lineBreaks: true, pop: 1 }
    },
    brackets: blockState('}'),
    parenthesis: blockState(')'),
    squareBrackets: blockState(']')
});
function parseTags(text) {
    // Here will the tags will be put as they are resolved
    const workingList = [];
    // Looks for last unclosed opening tag, e.g. <div attr=""
    const closeLastOpening = (endPosition) => {
        for (let i = workingList.length - 1; i >= 0; i--) {
            const openingTag = workingList[i].opening;
            if (openingTag && !openingTag.end) {
                openingTag.end = endPosition;
                return openingTag;
            }
        }
        return undefined;
    };
    /*
      Looks for the last "name" tag pair without a matching closing tag;
      Closes any unclosed tags in between with null;
      Closes the matching tag;
    */
    const closeMatchingOpeningTag = (closingTag, nestingLevel) => {
        for (let i = workingList.length - 1; i >= 0; i--) {
            const openingTag = workingList[i].opening;
            if (workingList[i].attributeNestingLevel === nestingLevel &&
                openingTag &&
                openingTag.end &&
                !workingList[i].closing) {
                if (openingTag.name === closingTag.name) {
                    workingList[i].closing = closingTag;
                    return;
                }
                workingList[i].closing = null;
            }
        }
        return undefined;
    };
    let attributeNestingLevel = 0; // Every block inside of attribute has higher level
    lexer.reset(text);
    let match = lexer.next();
    while (match !== undefined) {
        switch (match.type) {
            case 'tagOpening':
                workingList.push({
                    attributeNestingLevel,
                    opening: { name: match.value.slice(1), start: match.offset }
                });
                attributeNestingLevel += 1;
                break;
            case 'closeTag':
                closeLastOpening(match.offset + 1);
                attributeNestingLevel -= 1;
                break;
            case 'tagSelfClose':
                const lastOpening = closeLastOpening(match.offset + 2);
                attributeNestingLevel -= 1;
                closeMatchingOpeningTag(lastOpening, attributeNestingLevel);
                break;
            case 'tagClosing':
                closeMatchingOpeningTag({
                    name: match.value.slice(2, -1),
                    start: match.offset,
                    end: match.offset + match.value.length
                }, attributeNestingLevel);
                break;
        }
        match = lexer.next();
    }
    return workingList;
}
exports.parseTags = parseTags;
// Essentially checks if tag is {hmt.Match}
function isTagPairValid(pair) {
    return (!!pair.closing &&
        !!pair.opening &&
        pair.opening.end !== undefined &&
        pair.opening.start !== undefined);
}
function findMatchingTag(text, position) {
    const tagPairs = parseTags(text);
    const match = tagPairs
        .reverse()
        .find(pair => isTagPairValid(pair) &&
        ((position > pair.opening.start && position < pair.opening.end) ||
            (position > pair.closing.start && position < pair.closing.end)));
    return (match && {
        opening: match.opening,
        closing: match.closing
    });
}
exports.findMatchingTag = findMatchingTag;
// TODO: matching inside of strings
//# sourceMappingURL=tagFinder.js.map