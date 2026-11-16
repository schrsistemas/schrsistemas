import {test} from "node:test"; import assert from "node:assert/strict"; import {validateChatRequest,ValidationError} from "../src/validation.js";
test("accepts valid chat request",()=>{const r=validateChatRequest({project:"pescaradar",input:"Analise os sensores."});assert.equal(r.project,"pescaradar");});
test("rejects missing input",()=>{assert.throws(()=>validateChatRequest({project:"pescaradar"}),ValidationError);});
test("rejects path-like project",()=>{assert.throws(()=>validateChatRequest({project:"../admin",input:"x"}),ValidationError);});
test("rejects excessive output tokens",()=>{assert.throws(()=>validateChatRequest({project:"pescaradar",input:"x",max_output_tokens:99999}),ValidationError);});
