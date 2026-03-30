import { reportCliFailure, runCLI } from './index';

runCLI().catch(reportCliFailure);
