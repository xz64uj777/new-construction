using UnrealBuildTool;

public class BuildWorksTarget : TargetRules
{
    public BuildWorksTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_6;
        ExtraModuleNames.Add("BuildWorks");
    }
}
