---
id: spec_01KK5Q6GAC0G46JH3EWKBDCPZ7
title: "Test: add hello-world endpoint"
type: feature
status: draft
version: 0.1.0
priority: medium
---

# Test: add hello-world endpoint

## Goal

Add a `/hello` GET endpoint to the project that returns `{ "message": "Hello, world!" }` as JSON.

## Requirements

- [x] Add a GET handler for `/hello` that returns JSON `{ "message": "Hello, world!" }`
- [x] Add a unit test that verifies the endpoint returns 200 and the correct JSON body

## Scenarios

### Functional

1. **Hello endpoint returns correct JSON**: Send a GET request to `/hello` and verify the response body is `{ "message": "Hello, world!" }` with status 200 and content-type `application/json`.

### Changeability

1. **Change greeting message**: Modify the greeting from "Hello, world!" to "Hi there!" and verify only one file needs to change.
