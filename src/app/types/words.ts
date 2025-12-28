export interface WordData {
    _id: string | null; // id of the word
    word: string | null; // the word itself
    definition: [string] | []; // definitions of the word
    examples: [string] | []; // example sentences using the word
    hyphenation: [string] | []; // hyphenation points of the word
    pos: string | null; // part of speech
}
