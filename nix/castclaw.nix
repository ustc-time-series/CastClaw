{
  lib,
  stdenvNoCC,
  callPackage,
  bun,
  sysctl,
  makeBinaryWrapper,
  models-dev,
  ripgrep,
  installShellFiles,
  versionCheckHook,
  writableTmpDirAsHomeHook,
  node_modules ? callPackage ./node-modules.nix { },
}:
stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "castclaw";
  inherit (node_modules) version src;
  inherit node_modules;

  nativeBuildInputs = [
    bun
    installShellFiles
    makeBinaryWrapper
    models-dev
    writableTmpDirAsHomeHook
  ];

  configurePhase = ''
    runHook preConfigure

    cp -R ${finalAttrs.node_modules}/. .

    runHook postConfigure
  '';

  env.MODELS_DEV_API_JSON = "${models-dev}/dist/_api.json";
  env.CASTCLAW_DISABLE_MODELS_FETCH = true;
  env.CASTCLAW_VERSION = finalAttrs.version;
  env.CASTCLAW_CHANNEL = "local";

  buildPhase = ''
    runHook preBuild

    cd ./packages/castclaw
    bun --bun ./script/build.ts --single --skip-install
    bun --bun ./script/schema.ts schema.json

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    install -Dm755 dist/castclaw-*/bin/castclaw $out/bin/castclaw
    install -Dm644 schema.json $out/share/castclaw/schema.json

    wrapProgram $out/bin/castclaw \
      --prefix PATH : ${
        lib.makeBinPath (
          [
            ripgrep
          ]
          # bun runs sysctl to detect if dunning on rosetta2
          ++ lib.optional stdenvNoCC.hostPlatform.isDarwin sysctl
        )
      }

    runHook postInstall
  '';

  postInstall = lib.optionalString (stdenvNoCC.buildPlatform.canExecute stdenvNoCC.hostPlatform) ''
    # trick yargs into also generating zsh completions
    installShellCompletion --cmd castclaw \
      --bash <($out/bin/castclaw completion) \
      --zsh <(SHELL=/bin/zsh $out/bin/castclaw completion)
  '';

  nativeInstallCheckInputs = [
    versionCheckHook
    writableTmpDirAsHomeHook
  ];
  doInstallCheck = true;
  versionCheckKeepEnvironment = [ "HOME" "CASTCLAW_DISABLE_MODELS_FETCH" ];
  versionCheckProgramArg = "--version";

  passthru = {
    jsonschema = "${placeholder "out"}/share/castclaw/schema.json";
  };

  meta = {
    description = "CastClaw TUI agent CLI";
    homepage = "https://github.com/SkyeGT/CastClaw/";
    license = lib.licenses.mit;
    mainProgram = "castclaw";
    inherit (node_modules.meta) platforms;
  };
})
