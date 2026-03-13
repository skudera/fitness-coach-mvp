'use client'

import { useEffect, useState } from 'react'
import {
  loadEquipmentPreferences,
  saveEquipmentPreferences
} from '@/lib/storage-supabase'

export default function EquipmentPreferencesPage() {

  const [pressing,setPressing] = useState('')
  const [row,setRow] = useState('')
  const [legPress,setLegPress] = useState('')
  const [overhead,setOverhead] = useState('')
  const [core,setCore] = useState('')
  const [cardio,setCardio] = useState('')

  const [saving,setSaving] = useState(false)
  const [saved,setSaved] = useState(false)

  useEffect(() => {

    async function load(){
      const prefs = await loadEquipmentPreferences()

      if(!prefs) return

      setPressing(prefs.pressing_preference ?? '')
      setRow(prefs.row_preference ?? '')
      setLegPress(prefs.leg_press_preference ?? '')
      setOverhead(prefs.overhead_press_preference ?? '')
      setCore(prefs.core_preference ?? '')
      setCardio(prefs.cardio_preference ?? '')
    }

    load()

  },[])

  async function handleSave(){

    setSaving(true)

    await saveEquipmentPreferences({
      pressing_preference:pressing,
      row_preference:row,
      leg_press_preference:legPress,
      overhead_press_preference:overhead,
      core_preference:core,
      cardio_preference:cardio
    })

    setSaving(false)
    setSaved(true)

    setTimeout(()=>setSaved(false),2000)
  }

  function OptionRow({
    label,
    value,
    setValue,
    options
  }:any){

    return(

      <div className="space-y-2">

        <div className="label">{label}</div>

        <div className="flex gap-2 flex-wrap">

          {options.map((opt:string)=>{

            const active = value===opt

            return(

              <button
                key={opt}
                onClick={()=>setValue(opt)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold
                ${active
                  ? 'bg-emerald-500 text-black'
                  : 'bg-slate-800 text-slate-200'
                }`}
              >
                {opt}
              </button>

            )

          })}

        </div>

      </div>

    )

  }

  return(

    <div className="space-y-6 pb-10">

      <div>

        <div className="label">Preferences</div>

        <h1 className="text-2xl font-semibold tracking-tight">
          Equipment Preferences
        </h1>

        <p className="text-slate-300 mt-2">
          These guide substitutions and future workout planning.
        </p>

      </div>

      <div className="card space-y-6">

        <OptionRow
          label="Pressing preference"
          value={pressing}
          setValue={setPressing}
          options={[
            'Machines',
            'Dumbbells',
            'No preference'
          ]}
        />

        <OptionRow
          label="Row preference"
          value={row}
          setValue={setRow}
          options={[
            'Machine rows',
            'Cable rows',
            'No preference'
          ]}
        />

        <OptionRow
          label="Main leg press"
          value={legPress}
          setValue={setLegPress}
          options={[
            '45°',
            'Linear',
            'No preference'
          ]}
        />

        <OptionRow
          label="Overhead pressing"
          value={overhead}
          setValue={setOverhead}
          options={[
            'Machine',
            'Smith',
            'Avoid overhead'
          ]}
        />

        <OptionRow
          label="Core preference"
          value={core}
          setValue={setCore}
          options={[
            'Cable',
            'Machine',
            'Floor'
          ]}
        />

        <OptionRow
          label="Preferred cardio when flexible"
          value={cardio}
          setValue={setCardio}
          options={[
            'Elliptical',
            'Bike',
            'Treadmill',
            'Curve treadmill'
          ]}
        />

      </div>

      <button
        onClick={handleSave}
        className="w-full bg-blue-600 hover:bg-blue-500 rounded-2xl py-4 text-xl font-semibold"
      >

        {saving
          ? 'Saving...'
          : saved
            ? 'Saved'
            : 'Save Preferences'}

      </button>

    </div>

  )

}