import jvm from './scenarios/jvm';
import classloader from './scenarios/classloader';
import stringpool from './scenarios/stringpool';
import hashmapInternals from './scenarios/hashmap-internals';
import volatile from './scenarios/volatile';
import exceptionStack from './scenarios/exception-stack';

export const SCENARIOS = [jvm, classloader, stringpool, hashmapInternals, volatile, exceptionStack];
