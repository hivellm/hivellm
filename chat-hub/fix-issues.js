#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ISSUES_FILE = path.join(__dirname, '..', 'issues.json');

function unescapeText(text) {
    if (typeof text !== 'string') return text;

    // Fix the incorrectly escaped text - remove \\b word boundary escapes
    return text
        .replace(/\\b/g, '')     // Remove all \\b escapes
        .replace(/\\"/g, '"')    // Unescape quotes
        .replace(/\\n/g, '\n')   // Unescape newlines
        .replace(/\\t/g, '\t')   // Unescape tabs
        .replace(/\\f/g, '\f')   // Unescape form feeds
        .replace(/\\\\/g, '\\'); // Unescape backslashes (last to avoid conflicts)
}

function fixComment(comment) {
    return {
        ...comment,
        body: unescapeText(comment.body),
        body_original: unescapeText(comment.body_original)
    };
}

function cleanIssuesJson() {
    try {
        console.log('🔧 Reading issues.json...');
        const rawData = fs.readFileSync(ISSUES_FILE, 'utf8');
        const data = JSON.parse(rawData);

        console.log('🧹 Cleaning corrupted text...');
        let totalCleaned = 0;

        if (data.issues && Array.isArray(data.issues)) {
            data.issues.forEach(issue => {
                if (issue.comments && Array.isArray(issue.comments)) {
                    issue.comments = issue.comments.map(comment => {
                        // Check if comment has corrupted text (contains \\b patterns)
                        const isCorrupted = comment.body && comment.body.includes('\\b');
                        if (isCorrupted) {
                            console.log(`  ✅ Cleaning comment from ${comment.author} created at ${comment.created_at}`);
                            totalCleaned++;
                            return fixComment(comment);
                        }
                        return comment;
                    });
                }
            });
        }

        // Create backup
        const backupFile = ISSUES_FILE + '.backup-' + Date.now();
        fs.writeFileSync(backupFile, rawData);
        console.log(`💾 Backup created: ${backupFile}`);

        // Write cleaned data
        fs.writeFileSync(ISSUES_FILE, JSON.stringify(data, null, 2));

        console.log(`✅ Cleaning completed!`);
        console.log(`📊 Total comments cleaned: ${totalCleaned}`);
        console.log(`💾 Fixed file saved to: ${ISSUES_FILE}`);

    } catch (error) {
        console.error('❌ Error cleaning issues.json:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    cleanIssuesJson();
}

module.exports = { cleanIssuesJson, unescapeText };
