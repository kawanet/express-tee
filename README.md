# express-tee

T-splitter to mirror Express.js response

[![Node.js CI](https://github.com/kawanet/express-tee/workflows/Node.js%20CI/badge.svg?branch=master)](https://github.com/kawanet/express-tee/actions/)
[![npm version](https://badge.fury.io/js/express-tee.svg)](https://www.npmjs.com/package/express-tee)

## SYNOPSIS

```js
const express = require("express");
const tee = require("express-tee").tee;
const app = express();

// response previous response if available
app.use(express.static("cache"));

// dump response body to local cache directory
app.use(tee("cache"));

app.use((req, res) => {
    // some dynamic content
});

app.listen(3000);
```

See TypeScript declaration
[express-tee.d.ts](https://github.com/kawanet/express-tee/blob/master/types/express-tee.d.ts)
for more detail.

## SEE ALSO

- https://github.com/kawanet/express-intercept

## LICENSE

The MIT License (MIT)

Copyright (c) 2020 Yusuke Kawasaki

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
