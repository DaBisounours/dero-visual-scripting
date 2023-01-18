# Visual Scripting for DERO

![](dero-vs-screen.png)

This tool was made to design Smart contracts visually and generate DVM code to be deployed on the DERO Blockchain.

## Development

```sh
yarn && yarn dev
```

### TODO
- Graph
  - [ ] Split "Let-Dim" node, 
    - [ ] DIMs are put at the top of the function, DIM node with list of variables and their type ?
    - [ ] make let nodes like a process with one input 
    - [ ] make a variable node
  - [ ] make an Operation node for +, -, *, /, %, and also boolean &&, ||
- [ ] Export only a subset of functions
- [ ] [OPTIONAL] Graph schema Versionning and retrocompatibility
- UI
  - [ ] Rename function
  - [ ] Change function to process and vice versa
  - [ ] Remove function or process
- Docs
  - [ ] Write some basic documentation
  - [ ] Make a tutorial video
- [ ] Deploy on IPFS