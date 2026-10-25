#!/usr/bin/env python3
"""NetCDF-1 / NetCDF-2 binary header parser using standard library struct."""
import struct
from pathlib import Path
from typing import Dict, Any

def parse_nc1_header(path: Path) -> Dict[str, Any]:
    with open(path, "rb") as f:
        magic = f.read(4)
        if magic not in (b"CDF\x01", b"CDF\x02"):
            return {"error": f"Not a NetCDF-1/2 file (magic: {magic!r})"}
        
        is_nc2 = (magic == b"CDF\x02")
        numrecs = struct.unpack(">I", f.read(4))[0]
        
        def read_string() -> str:
            raw_len = struct.unpack(">I", f.read(4))[0]
            padded_len = ((raw_len + 3) // 4) * 4
            s = f.read(padded_len)[:raw_len].decode("utf-8", errors="replace")
            return s
            
        def read_att_list() -> Dict[str, Any]:
            tag = struct.unpack(">I", f.read(4))[0]
            if tag == 0:
                count = struct.unpack(">I", f.read(4))[0]  # consume 0 count
                return {}
            if tag != 0x0000000C:
                return {"_error": f"Invalid att tag {hex(tag)}"}
            count = struct.unpack(">I", f.read(4))[0]
            attrs = {}
            for _ in range(count):
                aname = read_string()
                atype, alen = struct.unpack(">II", f.read(8))
                # 1=byte, 2=char, 3=short, 4=int, 5=float, 6=double
                if atype == 2:  # char
                    plen = ((alen + 3) // 4) * 4
                    raw = f.read(plen)[:alen].decode("utf-8", errors="replace")
                    attrs[aname] = raw
                elif atype == 4:  # int
                    val = struct.unpack(f">{alen}i", f.read(alen * 4))
                    attrs[aname] = val[0] if alen == 1 else list(val)
                elif atype == 5:  # float
                    val = struct.unpack(f">{alen}f", f.read(alen * 4))
                    attrs[aname] = val[0] if alen == 1 else list(val)
                elif atype == 6:  # double
                    val = struct.unpack(f">{alen}d", f.read(alen * 8))
                    attrs[aname] = val[0] if alen == 1 else list(val)
                elif atype == 3:  # short
                    plen = ((alen * 2 + 3) // 4) * 4
                    raw = f.read(plen)
                    val = struct.unpack(f">{alen}h", raw[:alen * 2])
                    attrs[aname] = val[0] if alen == 1 else list(val)
                elif atype == 1:  # byte
                    plen = ((alen + 3) // 4) * 4
                    raw = f.read(plen)
                    attrs[aname] = raw[:alen]
                else:
                    attrs[aname] = f"Unsupported type {atype}"
            return attrs

        # Dimensions
        dtag = struct.unpack(">I", f.read(4))[0]
        dims = {}
        dim_names = []
        if dtag == 0x0000000A:
            dcount = struct.unpack(">I", f.read(4))[0]
            for _ in range(dcount):
                dname = read_string()
                dsize = struct.unpack(">I", f.read(4))[0]
                dims[dname] = dsize
                dim_names.append(dname)
        elif dtag != 0:
            return {"error": f"Invalid dim tag {hex(dtag)}"}
                
        # Global attributes
        gatts = read_att_list()
        
        # Variables
        vtag = struct.unpack(">I", f.read(4))[0]
        vars_info = {}
        if vtag == 0x0000000B:
            vcount = struct.unpack(">I", f.read(4))[0]
            for _ in range(vcount):
                vname = read_string()
                vndims = struct.unpack(">I", f.read(4))[0]
                vdimids = struct.unpack(f">{vndims}I", f.read(vndims * 4)) if vndims > 0 else ()
                vatts = read_att_list()
                vtype, vsize = struct.unpack(">II", f.read(8))
                voffset = struct.unpack(">Q" if is_nc2 else ">I", f.read(8 if is_nc2 else 4))[0]
                
                type_names = {1: "byte", 2: "char", 3: "short", 4: "int", 5: "float", 6: "double"}
                vars_info[vname] = {
                    "ndims": vndims,
                    "dims": [dim_names[i] for i in vdimids if i < len(dim_names)],
                    "dim_ids": vdimids,
                    "attrs": vatts,
                    "data_type": type_names.get(vtype, f"type_{vtype}"),
                    "vsize": vsize,
                    "offset": voffset,
                }
        elif vtag != 0:
            return {"error": f"Invalid var tag {hex(vtag)}"}
            
        return {
            "format": "NetCDF-1 (Classic 32-bit offset)" if not is_nc2 else "NetCDF-2 (64-bit offset)",
            "numrecs": numrecs,
            "dimensions": dims,
            "global_attributes": gatts,
            "variables": vars_info,
        }

def read_coords(path: Path, meta: Dict[str, Any]) -> Dict[str, Any]:
    with open(path, "rb") as f:
        res = {}
        vars_info = meta.get("variables", {})
        
        # Read lat
        if "lat" in vars_info:
            vlat = vars_info["lat"]
            sz = meta["dimensions"]["lat"]
            f.seek(vlat["offset"])
            lats = struct.unpack(f">{sz}d", f.read(sz * 8))
            res["lat_min"] = min(lats)
            res["lat_max"] = max(lats)
            res["lat_step"] = (max(lats) - min(lats)) / (sz - 1)
            res["lat_count"] = sz
            res["lats"] = lats
            
        # Read lon
        if "lon" in vars_info:
            vlon = vars_info["lon"]
            sz = meta["dimensions"]["lon"]
            f.seek(vlon["offset"])
            lons = struct.unpack(f">{sz}d", f.read(sz * 8))
            res["lon_min"] = min(lons)
            res["lon_max"] = max(lons)
            res["lon_step"] = (max(lons) - min(lons)) / (sz - 1)
            res["lon_count"] = sz
            res["lons"] = lons
            
        # Read month
        if "month" in vars_info:
            vm = vars_info["month"]
            sz = meta["dimensions"]["month"]
            f.seek(vm["offset"])
            months = struct.unpack(f">{sz}i", f.read(sz * 4))
            res["months"] = list(months)
            
    return res

if __name__ == "__main__":
    import sys
    test_file = Path("backend-resources/zeonodo-data2/pm25_arr_10km_2017_monthly.nc")
    meta = parse_nc1_header(test_file)
    print("Dimensions:", meta["dimensions"])
    print("Global Attributes:", meta["global_attributes"])
    print("Variables:")
    for vname, vinfo in meta["variables"].items():
        print(f"  {vname}: dims={vinfo['dims']}, type={vinfo['data_type']}, attrs={vinfo['attrs']}")
    coords = read_coords(test_file, meta)
    print(f"Latitude range: {coords['lat_min']:.4f} to {coords['lat_max']:.4f} (step: {coords['lat_step']:.4f}, count: {coords['lat_count']})")
    print(f"Longitude range: {coords['lon_min']:.4f} to {coords['lon_max']:.4f} (step: {coords['lon_step']:.4f}, count: {coords['lon_count']})")
    print(f"Months: {coords['months']}")

