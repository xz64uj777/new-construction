using UnrealBuildTool;

public class BuildWorksEditorTarget : TargetRules
{
    public BuildWorksEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_6;
        ExtraModuleNames.Add("BuildWorks");
    }
}
