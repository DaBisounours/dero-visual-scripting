import './App.css'

import { atom, useAtom } from 'jotai';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Button, Checkbox, CheckboxGroup, Container, Content, Drawer, IconButton, Input, InputGroup, Modal, Nav, Sidenav, Stack, Tooltip, Whisper } from 'rsuite'
import { match } from 'ts-pattern';
import { Canvas } from './components/Canvas'

import { colors } from './utils/theme'
import { hasSome, None, Ok, Option, Result, Some, Error, unwrap, isOk } from './utils/variants';

import { Functions, functionsAtom, generateProjectCode, initialFunctions, Links, Nodes, Project, projectOptionsAtom, storageProjectAtom, validateFunctions } from './graph/graph';
import { Node, NodeDataKind } from './graph/nodes';

import GearCircleIcon from '@rsuite/icons/legacy/GearCircle';
import MagicIcon from '@rsuite/icons/legacy/Magic';
import BranchIcon from '@rsuite/icons/Branch';
import FileDownloadIcon from '@rsuite/icons/FileDownload';
import FileUploadIcon from '@rsuite/icons/FileUpload';
import CombinationIcon from '@rsuite/icons/Combination';
import TrashIcon from '@rsuite/icons/Trash';
import CloseIcon from '@rsuite/icons/Close';
import CheckIcon from '@rsuite/icons/Check';

import { exportProject } from './graph/import-export';

export enum FunctionsAction {
  AddFunction = 'add function',
  EditFunction = 'edit function',
  EditFunctionNodes = 'edit function nodes',
  EditFunctionLinks = 'edit function links',
}

export type AddFunctionAction = {
  action: FunctionsAction.AddFunction,
  data: {
    name: string,
    isProcess: boolean,
  }
}

export type EditFunctionAction = {
  action: FunctionsAction.EditFunction,
  data: {
    key: string,
    name: string,
    isProcess: boolean,
  }
}
export type EditFunctionNodesAction = {
  action: FunctionsAction.EditFunctionNodes,
  data: {
    key: string,
    nodes: Nodes,
  }
}

export type EditFunctionLinksAction = {
  action: FunctionsAction.EditFunctionLinks,
  data: {
    key: string,
    links: Links,
  }
}

export type FunctionsActionType =
  | AddFunctionAction
  | EditFunctionAction
  | EditFunctionNodesAction
  | EditFunctionLinksAction



export const selectedFunctionAtom = atom<Option<string>>(Some('Initialize'))


type EditFunctionModalOpenMode = { mode: 'create', isProcess: boolean } | { mode: 'edit' };

type EditFunctionModalProps = {
  mode: EditFunctionModalOpenMode,
  open: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
}

const EditCurrentFunctionModal = ({ mode, open, setOpen }: EditFunctionModalProps) => {
  const [functions, setFunctions] = useAtom(functionsAtom);
  const [selectedFunction, setSelectedFunction] = useAtom(selectedFunctionAtom);

  const [name, setName] = useState('');
  useEffect(() => {
    if (mode.mode == 'edit') {
      setName(unwrap(selectedFunction))
    } else {
      setName('')
    }
  }, [selectedFunction])
  const isNameValid = name != '';

  const close = () => {
    setName('');
    setRemoving(false);
    setOpen(false)
  }

  function renameFunction(from: string, to: string) {
    setFunctions((draft) => {
      const old = { ...draft[from] };
      delete draft[from];
      console.warn(old);

      draft[to] = old;
      setSelectedFunction(Some(to));

      // look for process references named as such
      Object.entries(draft).forEach(([name, _function]) => {
        Object.entries(_function.nodes).forEach(([name, node]) => {
          if (node.data.type == NodeDataKind.Process) {
            if (node.data.process.name == from) {
              node.data.process.name = to;
            }
          }
        })
      })
    })
  }

  function removeFunction() {
    const fname = unwrap(selectedFunction);
    setFunctions((draft) => {
      delete draft[fname];
      if ('Initialize' in functions) {
        setSelectedFunction(Some('Initialize'));
      } else {
        setSelectedFunction(Some('InitializePrivate'));
      }
      close();
    })
  }

  const isInit = mode.mode == 'edit' && (unwrap(selectedFunction) == 'Initialize' || unwrap(selectedFunction) == 'InitializePrivate');

  const isProcess = match(mode)
    .with({ mode: 'create' }, m => m.isProcess)
    .with({ mode: 'edit' }, _ => hasSome(selectedFunction) ? functions[unwrap(selectedFunction)].isProcess : false)
    .exhaustive()

  const [removing, setRemoving] = useState(false);

  return <Modal size={'xs'} open={open} onClose={close}>
    <Modal.Header>
      <Modal.Title>{mode.mode.slice(0, 1).toUpperCase() + mode.mode.slice(1)} {isProcess ? 'process' : 'function'} {mode.mode == 'edit' ? unwrap(selectedFunction) : null}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <InputGroup>
        <Input placeholder="Name" disabled={isInit} value={name} onChange={(value) => setName((isProcess ? value.slice(0, 1).toLowerCase() : value.slice(0, 1).toUpperCase()) + value.slice(1))} />
      </InputGroup>
      {mode.mode == 'edit' ? <>
        {isInit ? <div> <Checkbox checked={name == 'InitializePrivate'} onChange={(_, checked) => {
          console.warn('PLOP');

          setName(checked ? 'InitializePrivate' : 'Initialize');
        }}>Private</Checkbox></div>
          : <>
            <Button
              style={{ background: 'red', margin: '1em' }}
              onClick={() => setRemoving(true)}
            >
              <TrashIcon /> Remove {unwrap(selectedFunction)}
            </Button>
            {removing
              ? <> sure ?
                <IconButton style={{ background: 'transparent' }} onClick={removeFunction} icon={<CheckIcon />} />
                <IconButton style={{ background: 'transparent' }} onClick={_ => setRemoving(false)} icon={<CloseIcon />} />
              </>
              : null}
          </>}
      </> : null}


    </Modal.Body>
    <Modal.Footer>
      <Button onClick={close} appearance="subtle">
        Cancel
      </Button>
      <Button onClick={() => {
        if (isNameValid && !(name in functions)) {
          match(mode)
            .with({ mode: 'create' }, () => {
              setFunctions((draft) => {
                draft[name] = { ...initialFunctions['Initialize'], isProcess: isProcess }
              })
              setSelectedFunction(Some(name));
            })
            .with({ mode: 'edit' }, () => {
              if (hasSome(selectedFunction)) {
                renameFunction(unwrap(selectedFunction), name);
              }
            })
            .exhaustive()
          close();
        }
      }} appearance="primary" disabled={!isNameValid || Object.keys(functions).map(f => f.toLowerCase()).includes(name.toLowerCase())}>
        Ok
      </Button>
    </Modal.Footer>
  </Modal>

}


type ImportProjectModalProps = { //! Also changes settings
  open: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
}
const ImportProjectModal = ({ open, setOpen }: ImportProjectModalProps) => {

  enum ImportMenu {
    File = 'file',
    Gallery = 'gallery',
  }
  const [active, setActive] = useState<ImportMenu>(ImportMenu.File);


  const [content, setContent] = useState<Option<Result<any>>>(None());
  const [partial, setPartial] = useState(false);
  const [partialOverwrite, setPartialOverwrite] = useState(false);
  const [functions, setFunctions] = useAtom(functionsAtom);
  const [projectOptions, setProjectOptions] = useAtom(projectOptionsAtom);

  const isContentValid = hasSome(content) && isOk(unwrap(content));

  const importProject = (value: any, event: any) => {
    if (event.target.files) {
      const fr = new FileReader();
      fr.onload = (e) => {
        const { result } = e.target || { result: null };
        if (result) {
          try {
            const parsed = JSON.parse(result.toString());
            const valid = parsed; // TODO isValid 
            setContent(Some(Ok(valid)));

          } catch (error) {
            setContent(Some(Error(error)))
          }
        } else {
          setContent(Some(Error('error while reading file')));
        }
      }
      fr.readAsText(event.target.files[0]);

    } else { setContent(None()); }
  }

  return <Modal size={'md'} open={open} onClose={_ => setOpen(false)}>
    <Modal.Header>
      <Modal.Title>Import</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Stack>
        <Nav vertical appearance='tabs' activeKey={active} onSelect={key => setActive(key)} style={{ width: 200 }}>
          <Nav.Item eventKey={ImportMenu.File} icon={<FileUploadIcon />}>File</Nav.Item>
          <Nav.Item eventKey={ImportMenu.Gallery} icon={<CombinationIcon />}>Gallery</Nav.Item>
        </Nav>
        <Stack direction='column' style={{ margin: '0 2em' }} spacing={16}>
          {match(active)
            .with(ImportMenu.File, _ => <>
              <h5 style={{ margin: '1em' }}>Import a <i>.json</i> file</h5>

              <Input type="file" accept='application/json' onChange={importProject} />
              <Whisper
                placement='left'
                speaker={<Tooltip>
                  This feature imports functions and processes from the imported file without removing existing ones (snippet).
                  When unselected, the whole project is replaced.
                </Tooltip>} >
                <Checkbox checked={partial} onChange={(_, checked) => { setPartial(checked); }}>Partial import</Checkbox>
              </Whisper>
              {partial ?
                <Whisper
                  placement='left'
                  speaker={<Tooltip>
                    This will overwrite functions and processes with the same name.
                  </Tooltip>} >
                  <Checkbox checked={partialOverwrite} onChange={(_, checked) => { setPartialOverwrite(checked); }}>Overwrite</Checkbox>
                </Whisper>
                : null}
              <div>{content.type == 'Some' && content.value.type == 'Ok' ? 'Project: ' + unwrap(content.value).name : null}</div>
            </>
            )
            .with(ImportMenu.Gallery, _ => <>
              <h5>Templates</h5>
              Coming soon...
            </>
            )
            .exhaustive()
          }
        </Stack>

      </Stack>

    </Modal.Body>
    <Modal.Footer>
      <Button onClick={_ => setOpen(false)} appearance="subtle">
        Cancel
      </Button>
      <Button
        onClick={() => {
          if (isContentValid) {
            const c: Project = unwrap(unwrap(content));
            console.log({ c });
            if (partial) {
              const merged: Functions = partialOverwrite ? { ...functions, ...c.functions } : { ...c.functions, ...functions }
              setFunctions(merged)
            } else {
              setFunctions(c.functions);
              setProjectOptions({ ...projectOptions, name: c.name })
            }
          }
          setOpen(false)
        }}
        appearance="primary" disabled={!isContentValid}>
        Load
      </Button>
    </Modal.Footer>
  </Modal >

}


type ExportProjectModalProps = { //! Also changes settings
  open: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
}
const ExportProjectModal = ({ open, setOpen }: ExportProjectModalProps) => {

  const [content, setContent] = useState<Option<Result<any>>>(None());
  const [partial, setPartial] = useState<Option<string[]>>(None());
  const [functions, setFunctions] = useAtom(functionsAtom);
  const [projectOptions, setProjectOptions] = useAtom(projectOptionsAtom);

  return <Modal size={'md'} open={open} onClose={_ => setOpen(false)}>
    <Modal.Header>
      <Modal.Title>Export</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Stack direction='column' alignItems='flex-start' spacing={16}>
        <Checkbox checked={hasSome(partial)} onChange={(_, checked) => { checked ? setPartial(Some(Object.keys(functions))) : setPartial(None()) }}>Partial</Checkbox>
        {hasSome(partial) ? <>
          <CheckboxGroup value={unwrap(partial)} onChange={v => setPartial(Some(v as string[]))}> {
            Object.keys(functions).map(f =>
              <Checkbox key={f} value={f}>{f}</Checkbox>)
          }
          </CheckboxGroup>
          <Button onClick={() => {
            const partialFunctions = Object.fromEntries(Object.entries(functions).filter(([key]) => unwrap(partial).includes(key)));

            exportProject({ ...projectOptions, functions: partialFunctions })
          }}>Export {Object.keys(functions).length == unwrap(partial).length ? "Full Project" : "Selected"}</Button>
        </> :
          <Button
            onClick={() => {
              exportProject({ ...projectOptions, functions })
            }}
          >Export Full Project</Button>
        }

      </Stack>
    </Modal.Body>
    <Modal.Footer>
      <Button onClick={_ => setOpen(false)} appearance="subtle">
        Back
      </Button>

    </Modal.Footer>
  </Modal >

}



type ProjectSettingsModalProps = ImportProjectModalProps;
const ProjectSettingsModal = ({ open, setOpen }: ProjectSettingsModalProps) => {

  const [projectOptions, setProjectOptions] = useAtom(projectOptionsAtom);
  const [name, setName] = useState(projectOptions.name);


  return <Modal size={'md'} open={open} onClose={_ => setOpen(false)}>
    <Modal.Header>
      <Modal.Title>Poject settings</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <InputGroup>
        <Input placeholder="Name" value={name} onChange={(value) => setName(value)} />
      </InputGroup>
    </Modal.Body>
    <Modal.Footer>
      <Button onClick={_ => setOpen(false)} appearance="subtle">
        Cancel
      </Button>
      <Button
        onClick={() => {
          setProjectOptions({ ...projectOptions, name })
          setOpen(false)
        }}
        appearance="primary" disabled={false}>
        Ok
      </Button>
    </Modal.Footer>
  </Modal>

}

export const projectCodeAtom = atom<string>('');


/******************************* APP ******************************** */

function App() {

  const [functions, setFunctions] = useAtom(functionsAtom);
  const [validGraph, setValidGraph] = useState(true);
  const [projectCode, setProjectCode] = useAtom(projectCodeAtom);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const { valid, errors } = validateFunctions(functions);
      if (valid != validGraph) {
        setValidGraph(valid);
      }

      if (valid) {
        setProjectCode(generateProjectCode(functions))
      }
    }, 300)
    return () => { clearTimeout(timeout); }
  }, [functions])



  const [projectOptions, setProjectOptions] = useAtom(projectOptionsAtom);
  const [, setSelectedFunction] = useAtom(selectedFunctionAtom);


  const [storageProject, setStorageProject] = useAtom(storageProjectAtom);
  useEffect(() => {
    setStorageProject({ ...projectOptions, functions });
  }, [projectOptions, functions])
  useEffect(() => {
    setFunctions(storageProject.functions);
    setProjectOptions({ name: storageProject.name });
  }, [])

  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [codeDrawerOpen, setCodeDrawerOpen] = useState(true);

  const [editFunctionModalOpen, setEditFunctionModalOpen] =
    useState(false);


  const [editFunctionModalMode, setEditFunctionModalMode] =
    useState<EditFunctionModalOpenMode>({ mode: 'create', isProcess: false });
  const [importProjectModalOpen, setImportProjectModalOpen] = useState(false);
  const [exportProjectModalOpen, setExportProjectModalOpen] = useState(false);
  const [projectSettingsModalOpen, setProjectSettingsModalOpen] = useState(false);


  // APP
  return (
    <Container>
      {/** 
       * Drawer 
       * */}
      <Drawer placement={'left'} open={menuDrawerOpen} onClose={() => setMenuDrawerOpen(false)}>
        <Drawer.Header>
          <Drawer.Title>{projectOptions.name}</Drawer.Title>
          <Drawer.Actions>
            <Whisper
              speaker={<Tooltip>Clear Project</Tooltip>}
              placement='bottom'
            >
              <IconButton icon={<TrashIcon />} onClick={() => {
                setSelectedFunction(None());
                setFunctions(initialFunctions);
                setProjectOptions({ name: 'Initial Project' });
                setStorageProject({ name: 'Initial Project', functions: initialFunctions });
                setSelectedFunction(Some('Initialize'));
              }} />
            </Whisper>
            <Whisper
              speaker={<Tooltip>Project Settings</Tooltip>}
              placement='bottom'
            >
              <IconButton icon={<GearCircleIcon />} onClick={() => {
                setProjectSettingsModalOpen(true);
              }} />
            </Whisper>
            <Whisper
              speaker={<Tooltip>Import</Tooltip>}
              placement='bottom'
            >
              <IconButton icon={<FileUploadIcon />} onClick={() => {
                setImportProjectModalOpen(true);
              }} />
            </Whisper>
            <Whisper
              speaker={<Tooltip>Export</Tooltip>}
              placement='bottom'
            >
              <IconButton icon={<FileDownloadIcon />} onClick={() => {

                setExportProjectModalOpen(true);
              }} />
            </Whisper>
          </Drawer.Actions>
        </Drawer.Header>
        <Drawer.Body style={{ padding: 0 }}>
          <Sidenav style={{ width: '100%' }}>
            <Sidenav.Body>
              <Nav activeKey="1">
                <Nav.Menu eventKey="3" title="Functions" icon={<MagicIcon />}>
                  {Object.keys(functions).filter(name => !functions[name].isProcess).map((name) =>
                    <Nav.Item key={name} eventKey={"3-" + name} onClick={(event) => {
                      setSelectedFunction(Some(name));

                      setMenuDrawerOpen(false);
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '1em' }}>
                        <div>{name}</div>
                        <IconButton size='xs' icon={<GearCircleIcon />} onClick={() => {
                          setSelectedFunction(Some(name));
                          setEditFunctionModalMode({ mode: 'edit' });
                          setEditFunctionModalOpen(true);

                        }} />
                      </div>
                    </Nav.Item>
                  )}
                  <Nav.Item eventKey={"3--new"} onClick={(event) => {
                    setEditFunctionModalMode({ mode: 'create', isProcess: false });
                    setEditFunctionModalOpen(true);
                    setMenuDrawerOpen(false);
                  }}><i>+ Create</i></Nav.Item>

                </Nav.Menu>
                <Nav.Menu eventKey="4" title="Processes" icon={<BranchIcon />}>
                  {Object.keys(functions).filter(name => functions[name].isProcess).map((name) =>
                    <Nav.Item key={name} eventKey={"4-" + name} onClick={(event) => {
                      setSelectedFunction(Some(name));
                      setMenuDrawerOpen(false);
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '1em' }}>
                        <div>{name}</div>
                        <IconButton size='xs' icon={<GearCircleIcon />} onClick={() => {
                          setSelectedFunction(Some(name));
                          setEditFunctionModalMode({ mode: 'edit' });
                          setEditFunctionModalOpen(true);

                        }} />
                      </div>
                    </Nav.Item>
                  )}
                  <Nav.Item eventKey={"4--new"} onClick={(event) => {
                    setEditFunctionModalMode({ mode: 'create', isProcess: true });
                    setEditFunctionModalOpen(true);
                    setMenuDrawerOpen(false);
                  }}><i>+ Create</i></Nav.Item>

                </Nav.Menu>
              </Nav>
            </Sidenav.Body>
          </Sidenav>
        </Drawer.Body>
      </Drawer>

      {/** 
       * Main 
       * */}
      <Content style={{ minHeight: '100vh', minWidth: '100vw' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ flexGrow: 1 }}>
            <Canvas
              gridCellSizePx={8}
              style={{
                height: 'calc(100vh - 64px)',
                background: colors.whiteAlpha(200),
              }}
              setMenuDrawerOpen={setMenuDrawerOpen}
              setCodeDrawerOpen={setCodeDrawerOpen}
              validGraph={validGraph} />
          </div>
          <div style={{ background: colors.whiteAlpha(180), width: codeDrawerOpen ? '600px' : 0, opacity: codeDrawerOpen ? 1 : 0, transition: 'all .4s ease-in-out', height: '100vh', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '64px', background: colors.blackAlpha(400), padding: '1em' }}>
              <IconButton icon={<CloseIcon />} onClick={_ => setCodeDrawerOpen(false)} style={{ background: 'none', marginRight: '1em' }} />Project Code
            </div>
            <pre style={{ padding: '2em' }}><code>
              {projectCode}
            </code></pre>
          </div>
        </div>
      </Content>

      {/** 
       * Modals 
       * */}
      <EditCurrentFunctionModal
        open={editFunctionModalOpen}
        setOpen={setEditFunctionModalOpen}
        mode={editFunctionModalMode}
      />
      <ImportProjectModal
        open={importProjectModalOpen}
        setOpen={setImportProjectModalOpen}
      />

      <ExportProjectModal
        open={exportProjectModalOpen}
        setOpen={setExportProjectModalOpen}
      />

      <ProjectSettingsModal
        open={projectSettingsModalOpen}
        setOpen={setProjectSettingsModalOpen}
      />
    </Container>


  )
}

export default App
