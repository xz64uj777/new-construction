// At the depot, keep the payloader visibly parked beside the lowboy so the opening scene is ready for loading. Do not leave it hidden/stacked on the trailer from a saved session.
if(!career.truckAtSite&&career.onTrailer.includes('loader')&&['rent-excavator','load-loader'].includes(currentStage(career)?.id)){career.onTrailer=career.onTrailer.filter(id=>id!=='loader');moveOffTrailer(loader,rig.position.x+5,rig.position.z+4);persist()}
updateHUD(career.loadNote);$('#brandPanel').classList.add('collapsed');$('#brandReopen').classList.add('show');requestAnimationFrame(animate);
