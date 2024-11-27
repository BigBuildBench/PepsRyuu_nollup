let { nollup, fs, expect, rollup } = require('../nollup');

describe ('Error Handling', () => {
    it ('should throw syntax error if there is a problem parsing the syntax', async () => {
        fs.stub('./src/main.js', () => [
            'console.log(123);',
            'var abc def = 123;'
        ].join('\n'));
        let compiled = false, thrown = false;

        let bundle = await nollup({
            input: './src/main.js'
        });

        try {
            await bundle.generate({ format: 'esm' });
            compiled = true;
        } catch (e) {
            thrown = true;
            expect(e.name).to.equal('SyntaxError');
            expect(e.message).to.equal([
                'Unexpected token (2:8)',
                '    var abc def = 123;',
                '            ^'
            ].join('\n'));
        }

        expect(compiled).to.be.false;
        expect(thrown).to.be.true;
    });

    it ('should not fail if plugin returns no sourcesContent is not returned from plugin', async () => {
        fs.stub('./src/main.js', () => `console.log(123)`);
        let thrown = false;

        let bundle = await nollup({
            input: './src/main.js',
            plugins: [{
                transform (code, id) {
                    return {
                        code,
                        map: {
                            version: 3,
                            file: 'main.js',
                            sources: ['main.js'],
                            mappings: 'A;'
                        }
                    }
                }
            }, {
                transform (code, id) {
                    return {
                        code,
                        map: {
                            version: 3,
                            file: 'main.js',
                            sources: ['main.js'],
                            mappings: 'A;'
                        }
                    }
                }
            }]
        });

        await bundle.generate({ format: 'esm' });
    });

    it ('should show frame error property if async error thrown in plugin hook not using error function', async () => {
        fs.stub('./src/main.js', () => `console.log(123)`);
        let compiled = false, thrown = false;

        let bundle = await nollup({
            input: './src/main.js',
            plugins: [{
                transform (code) {
                    return new Promise(resolve => {
                        let err = new Error('mycustomerror');
                        err.frame = '    My Code Frame';
                        err.loc = {
                            file: process.cwd() + '/lol.js',
                            line: 1,
                            column: 3
                        }
                        throw err;
                    });  
                }
            }]
        });

        try {
            await bundle.generate({ format: 'esm' });
            compiled = true;
        } catch (e) {
            thrown = true;
            expect(e.name).to.equal('Error');
            expect(e.message).to.equal([
                'mycustomerror',
                '\x1b[1m\x1b[37m/lol.js (1:3)\x1b[39m\x1b[22m',
                '\x1b[1m\x1b[37m    My Code Frame\x1b[39m\x1b[22m'
            ].join('\n'));
        }

        expect(compiled).to.be.false;
        expect(thrown).to.be.true;
    });

    it ('should support filename and start options for error object', async () => {
        fs.stub('./src/main.js', () => `console.log(123)`);
        let compiled = false, thrown = false;

        let bundle = await nollup({
            input: './src/main.js',
            plugins: [{
                transform (code) {
                    return new Promise(resolve => {
                        let err = new Error('mycustomerror');
                        err.frame = '    My Code Frame';
                        err.filename = process.cwd() + '/lol.js';
                        err.start = { line: 1, column: 3 };
                        throw err;
                    });  
                }
            }]
        });

        try {
            await bundle.generate({ format: 'esm' });
            compiled = true;
        } catch (e) {
            thrown = true;
            expect(e.name).to.equal('Error');
            expect(e.message).to.equal([
                'mycustomerror',
                '\x1b[1m\x1b[37m/lol.js (1:3)\x1b[39m\x1b[22m',
                '\x1b[1m\x1b[37m    My Code Frame\x1b[39m\x1b[22m'
            ].join('\n'));
        }

        expect(compiled).to.be.false;
        expect(thrown).to.be.true;
    });

    it ('should be able to rebuild after non error() method thrown', async () => {
        fs.stub('./src/main.js', () => `console.log(123)`);
        let phase = 1, passed = false;
        
        let bundle = await nollup({
            input: './src/main.js',
            plugins: [{
                transform (code) {
                    if (phase === 1) {
                        return new Promise(resolve => {
                            let err = new Error('mycustomerror');
                            err.frame = '    My Code Frame';
                            err.loc = {
                                file: process.cwd() + '/lol.js',
                                line: 1,
                                column: 3
                            }
                            throw err;
                        });  
                    } else {
                        passed = true;
                    }
                }
            }]
        });

        try {
            await bundle.generate({ format: 'esm' });
            compiled = true;
        } catch (e) {
            thrown = true;
            expect(e.name).to.equal('Error');
            expect(e.message).to.equal([
                'mycustomerror',
                '\x1b[1m\x1b[37m/lol.js (1:3)\x1b[39m\x1b[22m',
                '\x1b[1m\x1b[37m    My Code Frame\x1b[39m\x1b[22m'
            ].join('\n'));

            phase++;
            await bundle.generate({ format: 'esm' });
        }

        expect(phase).to.equal(2);
        expect(passed).to.be.true;
    });
});