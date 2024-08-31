{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs =
    inputs@{
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        overlays = [ ];

        pkgs = import nixpkgs { inherit system overlays; };

        # for dev shells nativeBuildInputs and buildInputs make no difference
        # though buildInputs are needed at run-time while nativeBuildInputs
        # are things only needed at compile time

        nativeBuildInputs = with pkgs; [ ];

        buildInputs = with pkgs; [
          nodejs_20
          fish
        ];

        packages = [ ];
      in
      with pkgs;
      {
        devShells.default = mkShell {
          inherit packages buildInputs nativeBuildInputs;

          shellHook = ''
            export PATH=$PATH:$PWD/api/node_modules/.bin
            export PATH=$PATH:$PWD/cli/node_modules/.bin
          '';
        };
      }
    );
}
