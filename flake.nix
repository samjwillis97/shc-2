{
inputs = {
  nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  old-bun-pkgs.url = "https://github.com/NixOS/nixpkgs/archive/4ab8a3de296914f3b631121e9ce3884f1d34e1e5.tar.gz";
  flake-utils.url = "github:numtide/flake-utils";
};
outputs = inputs @ { self, nixpkgs, old-bun-pkgs, flake-utils }:
  flake-utils.lib.eachDefaultSystem
    (system:
      let
        overlays = [ ];

        pkgs = import nixpkgs {
          inherit system overlays;
        };

        bun-pkgs = import old-bun-pkgs {
          inherit system overlays;
        };

        # for dev shells nativeBuildInputs and buildInputs make no difference
        # though buildInputs are needed at run-time while nativeBuildInputs
        # are things only needed at compile time

        nativeBuildInputs = with pkgs; [ ];

        buildInputs = with pkgs; [];

        packages = [ pkgs.jless bun-pkgs.bun ];
      in
      with pkgs;
      {
        devShells.default = mkShell {
          inherit packages buildInputs nativeBuildInputs;

          shellHook = ''
            export PATH=$PATH:$PWD/node_modules/.bin
          '';
        };
      }
    );
}
