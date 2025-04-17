const badWords = [
    'lol',
    'badword2',
    'badword3',
    'badword4',
    'badword5',
    // Add more bad words here
];

const filterBadWords = (text) => {
    let filteredText = text.toLowerCase();
    let containsBadWord = false;
    
    badWords.forEach(word => {
        if (filteredText.includes(word.toLowerCase())) {
            containsBadWord = true;
        }
    });

    return {
        containsBadWord,
        originalText: text
    };
};

module.exports = {
    badWords,
    filterBadWords
}; 