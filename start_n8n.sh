#!/bin/bash
echo '🚀 Starting n8n with full local script permissions...'
export NODE_FUNCTION_ALLOW_BUILTIN='*'
export NODE_FUNCTION_ALLOW_EXTERNAL='*'
export N8N_BLOCK_ENV_ACCESS_IN_NODE=false
export N8N_RESTRICT_FILE_ACCESS_TO='/home/satoru'

npx n8n
