# SHC the 2nd

## Some thoughts

- Plugins;
    - what if I want one to ask for user input? like a token
    - a way to show all the used variables and hooks/functions etc.
- Make a cache available in the context object passed to functions
- How to handle removing something, i.e. an endpoint doesn't want to use a query param set by the parent
- Handle collections of workspaces, somehow, collection should:
    - allow global variables
    - allow global variable sets
    - allow global plugins I guess? this would be more UI related though I imagine or for global pre/pre hooks
    - auto discovery directory for any workspaces
    - imported workspaces from Github
    - now are collections more for the consuming application (CLI, GUI, etc.)? no, this would allow for better use of both though
        - actually maybe the auto discovery stuff is better for consumer, but other stuff is good for a collection
- Okay, so... I need to work out who is going to do file system operations.. Maybe I provide a callback to do the file op?
    - OR a setup function to provide the file system operations that can be used throughout...
