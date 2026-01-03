{ pkgs }: {
  deps = [
    pkgs.nodejs-16_x
    pkgs.nodePackages.npm
    pkgs.replitPackages.jest
    pkgs.discord-cli
  ];
}