import path from 'path';
import * as jest from 'jest';

process.env.NODE_ENV = 'test';
const cwd = process.cwd();
const config = path.resolve(__dirname, '../../jest.config.js');

jest.run([...process.argv.slice(2), '--rootDir', cwd, '--config', config]);
