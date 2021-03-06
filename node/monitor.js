// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';

var format = require('util').format;
var inherits = require('util').inherits;

module.exports.ChanConnMonitor = ChanConnMonitor;

function ChanConnMonitor(channel, options) {
    var self = this;

    self.options = options;
    self.channel = channel;
    self.interval = options.interval;
    self.timers = channel.timers;
    self.timer = null;
    self.running = false;

    if (options.eachConn) {
        self.eachConn = options.eachConn;
    }
    if (options.summary) {
        self.summary = options.summary;
    }
    if (options.log) {
        self.log = options.log;
    }
}

ChanConnMonitor.prototype.log = console.log;

ChanConnMonitor.prototype.summary = function summary() {
};

ChanConnMonitor.prototype.run = function run() {
    var self = this;

    if (self.channel.destroyed) {
        return;
    }

    self.running = true;
    self.timer = self.timers.setTimeout(tickMe, self.interval);

    function tickMe() {
        self.tick();
    }
};

ChanConnMonitor.prototype.tick = function tick() {
    var self = this;

    self.timers.clearTimeout(self.timer);
    self.timer = null;

    if (!self.running) {
        return;
    }

    if (self.channel.destroyed) {
        self.running = false;
        return;
    }

    if (self.eachConn) {
        self.channel.peers.values().forEach(eachPeer);
        if (self.channel.serverConnections) {
            Object.keys(self.channel.serverConnections).forEach(eashServerConn);
        }
    }

    self.summary({
        channel: self.channel
    });

    self.timer = self.timers.setTimeout(tockMe, self.interval);

    function eashServerConn(addr) {
        var conn = self.channel.serverConnections[addr];
        var connDesc = format('serverConn[%s]', addr);
        self.eachConn({
            channel: self.channel,
            peer: null,
            peerDesc: '',
            conn: conn,
            connDesc: connDesc
        });
    }

    function eachPeer(peer, j) {
        var peerDesc = format('peer[%s]', j);
        peer.connections.forEach(function eachConn(conn, k) {
            var connDesc = format('conn[%s]', k);
            self.eachConn({
                channel: self.channel,
                peer: peer,
                peerDesc: peerDesc,
                conn: conn,
                connDesc: connDesc
            });
        });
    }

    function tockMe() {
        self.tick();
    }
};

module.exports.OpKindMonitor = OpKindMonitor;

function OpKindMonitor(channel, options) {
    var self = this;
    ChanConnMonitor.call(self, channel, options);
    self.inCounts = [];
    self.outCounts = [];
}

inherits(OpKindMonitor, ChanConnMonitor);

OpKindMonitor.prototype.eachConn = function eachConn(stuff) {
    var self = this;

    var conn = stuff.conn;
    var desc = conn.connDesc;
    if (conn.peerDesc) {
        desc = conn.peerDesc + ' ';
    }
    desc = format('relay %s %s', stuff.channel.hostPort, desc);

    var inKeys = Object.keys(conn.ops.requests.in);
    if (inKeys.length) {
        var inCount = countConstructors(conn.ops.requests.in);
        self.inCounts.push(inCount);
    }

    var outKeys = Object.keys(conn.ops.requests.out);
    if (outKeys.length) {
        var outCount = countConstructors(conn.ops.requests.out);
        self.outCounts.push(outCount);
    }
};

OpKindMonitor.prototype.summary = function summary() {
    var self = this;

    if (self.inCounts.length) {
        self.log('= %s IN COUNTS: %j',
                    self.options.desc,
                    self.inCounts.reduce(sumCounts));
        self.inCounts.length = 0;
    }

    if (self.outCounts.length) {
        self.log('= %s OUT COUNTS: %j',
                    self.options.desc,
                    self.outCounts.reduce(sumCounts));
        self.outCounts.length = 0;
    }
};

function sumCounts(a, b) {
    Object.keys(b).forEach(function eachB(key) {
        a[key] = (a[key] || 0) + b[key];
    });
    return a;
}

function countConstructors(obj) {
    var counts = {};
    Object.keys(obj).forEach(function each(prop) {
        var name = obj[prop].constructor.name;
        counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
}
