# Visual Scripting for DERO

![](dero-vs-screen.png)

This tool was made to design Smart contracts visually and generate DVM code to be deployed on the DERO Blockchain.

## Development

```sh
yarn && yarn dev
```

### TODO
- Graph & UI
  - [x] Add, remove, edit nodes and links
  - [x] Store in local storage
  - [ ] Import / Export
  - [x] Code generation
  - [ ] Split "Let-Dim" node, 
    - [ ] DIMs are put at the top of the function, DIM node with list of variables and their type ?
    - [ ] make let nodes like a process with one input 
    - [ ] make a variable node
  - [ ] make an Operation node for +, -, *, /, %, and also boolean &&, ||, ... (check docs)
  - [x] Display Code in an expandable window on the right side
  - [ ] Export only a subset of functions
  - [ ] [OPTIONAL] Graph schema Versionning and retrocompatibility
  - [ ] Rename function
  - [ ] Change function to process and vice versa
  - [ ] Remove function or process
  - [ ] [OPTIONAL] Make links splines instead of straight lines
- Docs
  - [ ] Write some basic documentation
  - [ ] Make a tutorial video
- Deployment
  - [ ] Deploy on IPFS
  - [ ] Install / Test on simulator
- [ ] Refactor
  - [ ] Header
  - [ ] Graph types all in one place

### Improvements suggestions
> - Read from a smart contract
>
>Depending on how the smart contract is formatted it might be hard. I'm open to any advice on parsing.

> Right clicking a blank area of canvas brings up a list of nodes that can be created.

> Perhaps a menu of object primitives along the top that can bed dragged into the scene
