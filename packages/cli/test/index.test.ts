import { Command } from 'commander';

import { DyCliError, log } from '@dysonic/dy-cli-core';

import { createProgram, reportCliFailure, runCLI } from '../src';

describe('@dysonic/dy-cli', () => {
  test('should mount create, install, add, build, test, version and publish commands', () => {
    const program = createProgram();
    const commandNames = program.commands.map((command) => command.name());

    expect(commandNames).toEqual(
      expect.arrayContaining(['create', 'install', 'add', 'build', 'test', 'version', 'publish']),
    );
  });

  test('should reject unknown top-level commands', async () => {
    const program = createProgram();

    program.exitOverride();

    await expect(program.parseAsync(['node', 'dy-cli', 'unknown'])).rejects.toBeTruthy();
  });

  test('runCLI should call commander parseAsync', async () => {
    const program = createProgram();
    program.exitOverride();
    const spy = jest.spyOn(Command.prototype, 'parseAsync').mockResolvedValue(program);
    try {
      await runCLI(['node', 'dy-cli', '--version']);
      expect(spy).toHaveBeenCalledWith(['node', 'dy-cli', '--version']);
    } finally {
      spy.mockRestore();
    }
  });

  test('cli entry forwards DyCliError to reportCliFailure', async () => {
    jest.resetModules();
    const core = require('@dysonic/dy-cli-core');
    const logSpy = jest.spyOn(core.log, 'error').mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    jest.doMock('../src/index', () => ({
      ...jest.requireActual('../src/index'),
      runCLI: jest.fn().mockRejectedValue(new core.DyCliError('INVALID_ARGUMENT', 'cli-bootstrap')),
    }));

    await import('../src/cli');
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(logSpy).toHaveBeenCalledWith('cli-bootstrap');
    expect(exitSpy).toHaveBeenCalledWith(1);

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test('reportCliFailure should log dy errors and exit', () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const logSpy = jest.spyOn(log, 'error').mockImplementation(() => {});

    expect(() => reportCliFailure(new DyCliError('INVALID_ARGUMENT', 'bad'))).toThrow('exit:1');

    expect(logSpy).toHaveBeenCalledWith('bad');

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test('reportCliFailure should print other errors to stderr and exit', () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => reportCliFailure(new Error('oops'))).toThrow('exit:1');
    expect(errSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'oops' }));

    errSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
