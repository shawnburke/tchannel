package main

// Copyright (c) 2015 Uber Technologies, Inc.

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

// This file implements go name generation for thrift identifiers.
// It has to match the Apache Thrift generated names.

import "strings"

// goKeywords taken from https://golang.org/ref/spec#Keywords (and added error).
var goKeywords = map[string]bool{
	"error":       true,
	"break":       true,
	"default":     true,
	"func":        true,
	"interface":   true,
	"select":      true,
	"case":        true,
	"defer":       true,
	"go":          true,
	"map":         true,
	"struct":      true,
	"chan":        true,
	"else":        true,
	"goto":        true,
	"package":     true,
	"switch":      true,
	"const":       true,
	"fallthrough": true,
	"if":          true,
	"range":       true,
	"type":        true,
	"continue":    true,
	"for":         true,
	"import":      true,
	"return":      true,
	"var":         true,
}

func goName(name string) string {
	// Thrift Identifier from IDL: ( Letter | '_' ) ( Letter | Digit | '.' | '_' )*
	// Go identifier from spec: letter { letter | unicode_digit } .
	// Go letter allows underscore, so the only difference is period. However, periods cannot
	// actaully be used - this seems to be a bug in the IDL.
	if _, ok := goKeywords[name]; ok {
		// The thrift compiler appends _a1 for any clashes with go keywords.
		name += "_a1"
	}

	name = camcelCase(name)
	return name
}

// camcelCase takes a name with underscores such as my_arg and returns camelCase (e.g. myArg).
func camcelCase(name string) string {
	parts := strings.Split(name, "_")
	for i := 1; i < len(parts); i++ {
		name := parts[i]
		if name == "" {
			continue
		}

		// If the first letter is uppercase, Thrift keeps the underscore.
		if strings.ToUpper(name[0:1]) == name[0:1] {
			name = "_" + name
		} else {
			name = strings.ToUpper(name[0:1]) + name[1:]
		}

		parts[i] = name
	}
	return strings.Join(parts, "")
}

func avoidThriftClash(name string) string {
	if strings.HasSuffix(name, "Result") || strings.HasSuffix(name, "Args") {
		return name + "_"
	}
	return name
}

// goPublicName returns a go identifier that is exported.
func goPublicName(name string) string {
	// Public names cannot clash with goKeywords as they are all lowercase.
	name = camcelCase(name)
	name = strings.ToUpper(name[0:1]) + name[1:]
	return name
}

// goPublicFieldName returns the name of the field as used in a struct.
func goPublicFieldName(name string) string {
	name = goName(name)
	name = strings.ToUpper(name[0:1]) + name[1:]
	return avoidThriftClash(name)
}

var thriftToGo = map[string]string{
	"bool": "bool",
	"byte":   "int8",
	"i16":    "int16",
	"i32":    "int32",
	"i64":    "int64",
	"double": "float64",
	"string": "string",
}
