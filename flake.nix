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

        shc-cli = pkgs.buildNpmPackage {
          pname = "shc-cli";
          src = ./cli;
          name = "shc";
          npmDepsHash = "sha256-wDZS3VRsBB6yCPFguxkJLPmPWCuNn8kl1KqXhjNHvVw=";
          makeCacheWritable = false;
        };

        nativeBuildInputs = with pkgs; [ ];

        buildInputs = with pkgs; [ nodejs_20 ];

        packages = with pkgs; [
          fish
          prefetch-npm-deps
          jless
          shc-cli
        ];
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

        packages = {
          default = shc-cli;
        };
      }
    );
}
