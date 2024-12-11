#!/bin/bash

#navigate to the directory containing index.js
cd "$(dirname "$0")"
#run
node index.js && google-chrome-stable http://localhost:3000